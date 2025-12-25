"""Main Reflex app for Gemma chat using Ollama."""

import reflex as rx
from .state import ChatState, QA


def message(qa: QA) -> rx.Component:
    """A single question/answer message."""
    return rx.box(
        # User question (right aligned, blue)
        rx.box(
            rx.text(
                qa.question,
                background_color="#3182ce",
                color="white",
                padding="12px 16px",
                border_radius="12px",
                display="inline-block",
                max_width="80%",
            ),
            text_align="right",
            width="100%",
            margin_bottom="8px",
        ),
        # Assistant answer (left aligned, gray)
        rx.box(
            rx.text(
                qa.answer,
                background_color="#e2e8f0",
                color="black",
                padding="12px 16px",
                border_radius="12px",
                display="inline-block",
                max_width="80%",
                white_space="pre-wrap",
            ),
            text_align="left",
            width="100%",
        ),
        width="100%",
        padding_y="4",
    )


def index() -> rx.Component:
    """Main chat page."""
    return rx.center(
        rx.vstack(
            # Header
            rx.vstack(
                rx.heading("Gemma 🌐 Ollama", size="9", weight="bold"),
                rx.text(
                    "A local LLM running via Ollama. Fast and private.",
                    font_size="lg",
                    color="gray.500",
                ),
                spacing="2",
                align_items="center",
                padding_y="6",
            ),
            # Chat messages
            rx.box(
                rx.scroll_area(
                    rx.vstack(
                        rx.text(
                            "Hello! I am Gemma, running locally via Ollama. Ask me anything!",
                            bg="gray.100",
                            color="black",
                            padding="12px 16px",
                            border_radius="xl",
                            max_width="80%",
                        ),
                        rx.foreach(ChatState.chats, message),
                        spacing="2",
                        padding="4",
                        width="100%",
                    ),
                    height="50vh",
                    scrollbars="vertical",
                ),
                border="1px solid",
                border_color="gray.200",
                border_radius="xl",
                width="100%",
                bg="white",
                box_shadow="sm",
            ),
            # Loading indicator
            rx.cond(
                ChatState.is_loading,
                rx.hstack(
                    rx.spinner(size="3"),
                    rx.text("Gemma is thinking...", color="gray.500"),
                    spacing="2",
                    padding="2",
                ),
            ),
            # Input area
            rx.hstack(
                rx.input(
                    placeholder="Ask Gemma anything...",
                    value=ChatState.input_text,
                    on_change=ChatState.set_input_text,
                    flex="1",
                    on_key_down=lambda e: rx.cond(
                        e == "Enter", ChatState.process_question(), None
                    ),
                    padding_y="6",
                    border_radius="xl",
                    disabled=ChatState.is_loading,
                ),
                rx.button(
                    rx.icon("send"),
                    on_click=ChatState.process_question,
                    loading=ChatState.is_loading,
                    border_radius="xl",
                    size="3",
                    color_scheme="blue",
                ),
                width="100%",
                spacing="2",
            ),
            rx.text(
                "Powered by Ollama. Make sure Ollama is running locally with the gemma3:1b model.",
                font_size="xs",
                color="gray.400",
                text_align="center",
            ),
            width="100%",
            max_width="700px",
            spacing="6",
            padding="20px",
            align_items="center",
        ),
        min_height="100vh",
        bg="gray.50",
    )


app = rx.App(
    theme=rx.theme(
        appearance="light",
        accent_color="blue",
    ),
)
app.add_page(index, title="Gemma x Ollama Chat")
