import json
import re
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline


def extract_function_call(model_output):
    """
    Parses a string containing specific function call markers and returns
    a list of function call objects.

    Example output format:
    <start_function_call>call:open_map{query:<escape>San Francisco<escape>}<end_function_call>
    """
    results = []
    call_pattern = r"<start_function_call>(.*?)<end_function_call>"
    raw_calls = re.findall(call_pattern, model_output, re.DOTALL)

    for raw_call in raw_calls:
        if not raw_call.strip().startswith("call:"):
            continue

        try:
            # Separate name and args
            pre_brace, args_segment = raw_call.split("{", 1)
            function_name = pre_brace.replace("call:", "").strip()

            # Remove trailing '}'
            args_content = args_segment.strip()
            if args_content.endswith("}"):
                args_content = args_content[:-1]

            arguments = {}
            # Pattern: key:<escape>value<escape>
            arg_pattern = r"(?P<key>[^:,]*?):<escape>(?P<value>.*?)<escape>"
            arg_matches = re.finditer(arg_pattern, args_content, re.DOTALL)

            for match in arg_matches:
                key = match.group("key").strip()
                value = match.group("value")
                arguments[key] = value

            results.append(
                {"function": {"name": function_name, "arguments": arguments}}
            )
        except ValueError:
            continue
    return results


import os
from huggingface_hub import login


def run_inference(user_prompt):
    # Check for HF token in environment
    hf_token = os.getenv("HF_TOKEN")
    if hf_token:
        print("Authenticating with Hugging Face...")
        login(token=hf_token)

    model_id = "google/functiongemma-270m-it"
    print(f"Loading model: {model_id}...")

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        device_map="auto",
        torch_dtype=torch.bfloat16,
        attn_implementation="eager",
    )

    pipe = pipeline("text-generation", model=model, tokenizer=tokenizer)

    # Define the tools (functions) available to the model
    tools = [
        {
            "function": {
                "name": "turn_on_flashlight",
                "description": "Turns the flashlight on.",
                "parameters": {"type": "OBJECT", "properties": {}},
            }
        },
        {
            "function": {
                "name": "send_email",
                "description": "Sends an email.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "to": {"type": "STRING", "description": "Recipient email."},
                        "subject": {"type": "STRING", "description": "Email subject."},
                        "body": {"type": "STRING", "description": "Email body."},
                    },
                    "required": ["to", "subject"],
                },
            }
        },
        {
            "function": {
                "name": "create_calendar_event",
                "description": "Creates a new calendar event.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "title": {"type": "STRING", "description": "Event title."},
                        "datetime": {
                            "type": "STRING",
                            "description": "Format: YYYY-MM-DDTHH:MM:SS.",
                        },
                    },
                    "required": ["title", "datetime"],
                },
            }
        },
    ]

    messages = [
        {
            "role": "developer",
            "content": "Current date and time: 2024-12-24T16:00:00. You are a model that can do function calling.",
        },
        {"role": "user", "content": user_prompt},
    ]

    # Format the prompt using the chat template
    prompt = tokenizer.apply_chat_template(
        messages, tools=tools, tokenize=False, add_generation_prompt=True
    )

    print(f"\n--- Generated Prompt ---\n{prompt}\n")

    print("Generating response...")
    output = pipe(prompt, max_new_tokens=256)
    model_output = output[0]["generated_text"][len(prompt) :].strip()

    print(f"\n--- Model Output ---\n{model_output}\n")

    # Extract and print function calls
    calls = extract_function_call(model_output)
    if calls:
        print("--- Extracted Function Calls ---")
        print(json.dumps(calls, indent=2))
    else:
        print("No function calls extracted.")


if __name__ == "__main__":
    test_prompt = (
        "Turn on the flashlight and schedule a meeting with Bob tomorrow at 10am."
    )
    run_inference(test_prompt)
