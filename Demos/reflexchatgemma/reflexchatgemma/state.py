"""State management for Gemma chat using Ollama."""

import asyncio
from typing import AsyncGenerator, List
import reflex as rx
from ollama import AsyncClient

ollama_client = AsyncClient()

# Default model - can be changed to any Ollama model
MODEL_NAME = "gemma3:1b"


class QA(rx.Base):
    """A question and answer pair."""

    question: str
    answer: str


class ChatState(rx.State):
    """Chat state for Gemma model."""

    chats: List[QA] = []
    input_text: str = ""
    is_loading: bool = False

    @rx.event
    def set_input_text(self, text: str):
        self.input_text = text

    @rx.event(background=True)
    async def process_question(self) -> AsyncGenerator:
        """Process a question and get streaming response from Ollama."""
        question = self.input_text.strip()
        if not question:
            return

        # Add the question/answer pair to the list
        async with self:
            qa = QA(question=question, answer="")
            self.chats = [*self.chats, qa]
            self.input_text = ""
            self.is_loading = True
            yield
            await asyncio.sleep(0.1)

        try:
            # Prepare messages for Ollama
            ollama_messages = []
            for chat in self.chats:
                ollama_messages.append({"role": "user", "content": chat.question})
                if chat.answer:
                    ollama_messages.append(
                        {"role": "assistant", "content": chat.answer}
                    )

            # Stream response from Ollama
            async for chunk in await ollama_client.chat(
                model=MODEL_NAME,
                messages=ollama_messages,
                stream=True,
            ):
                async with self:
                    if "message" in chunk and "content" in chunk["message"]:
                        # Update the last QA's answer
                        last_qa = self.chats[-1]
                        updated_qa = QA(
                            question=last_qa.question,
                            answer=last_qa.answer + chunk["message"]["content"],
                        )
                        self.chats = [*self.chats[:-1], updated_qa]
                        yield
                        await asyncio.sleep(0.01)

        except Exception as e:
            async with self:
                last_qa = self.chats[-1]
                updated_qa = QA(question=last_qa.question, answer=f"Error: {str(e)}")
                self.chats = [*self.chats[:-1], updated_qa]

        finally:
            async with self:
                self.is_loading = False
                yield
