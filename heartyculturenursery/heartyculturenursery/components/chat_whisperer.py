import reflex as rx
from heartyculturenursery.state import ChatState


def message_bubble(message: dict) -> rx.Component:
    """A single message bubble in the chat."""
    is_user = message["role"] == "user"
    return rx.box(
        rx.text(
            message["content"],
            background=rx.cond(is_user, "#22c55e", "#f3f4f6"),
            color=rx.cond(is_user, "white", "#1a1a1a"),
            padding="10px 14px",
            border_radius="18px",
            border_bottom_right_radius=rx.cond(is_user, "4px", "18px"),
            border_bottom_left_radius=rx.cond(is_user, "18px", "4px"),
            max_width="85%",
            font_size="0.95em",
            box_shadow="0 2px 4px rgba(0,0,0,0.05)",
        ),
        display="flex",
        justify_content=rx.cond(is_user, "flex-end", "flex-start"),
        padding_y="6px",
        width="100%",
    )


def chat_whisperer() -> rx.Component:
    """The floating chatbot component."""
    return rx.box(
        # Chat Toggle Button
        rx.button(
            rx.cond(
                ChatState.is_open,
                rx.text("X"),
                rx.text("Chat"),
            ),
            on_click=ChatState.toggle_chat,
            position="fixed",
            bottom="24px",
            right="24px",
            width="60px",
            height="60px",
            border_radius="30px",
            background="linear-gradient(135deg, #22c55e, #16a34a)",
            color="white",
            box_shadow="0 4px 15px rgba(34, 197, 94, 0.4)",
            cursor="pointer",
            z_index="1000",
            _hover={
                "transform": "scale(1.05)",
                "box_shadow": "0 6px 20px rgba(34, 197, 94, 0.5)",
            },
            transition="all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        ),
        # Chat Window
        rx.box(
            rx.vstack(
                # Header
                rx.hstack(
                    rx.vstack(
                        rx.text(
                            "Gemma Plant Whisperer",
                            font_weight="700",
                            font_size="1.1em",
                            color="white",
                        ),
                        rx.hstack(
                            rx.box(
                                width="8px",
                                height="8px",
                                background="#4ade80",
                                border_radius="4px",
                            ),
                            rx.text(
                                "AI Garden Expert Online",
                                font_size="0.75em",
                                color="rgba(255,255,255,0.8)",
                            ),
                            align="center",
                            spacing="1",
                        ),
                        align_items="start",
                        spacing="0",
                    ),
                    rx.spacer(),
                    rx.text(
                        "Clear",
                        color="white",
                        cursor="pointer",
                        on_click=ChatState.clear_chat,
                        _hover={"opacity": "0.7"},
                    ),
                    width="100%",
                    padding="16px",
                    background="linear-gradient(135deg, #22c55e, #16a34a)",
                    border_radius="12px 12px 0 0",
                ),
                # Progress Bar (Model Loading)
                rx.cond(
                    ChatState.loading_progress != "",
                    rx.box(
                        rx.text(
                            ChatState.loading_progress,
                            font_size="0.7em",
                            color="#666",
                            text_align="center",
                        ),
                        rx.box(
                            rx.box(width="40%", height="100%", background="#22c55e"),
                            width="100%",
                            height="4px",
                            background="#eee",
                            border_radius="2px",
                            overflow="hidden",
                        ),
                        padding="8px 16px",
                        width="100%",
                        background="#f9fafb",
                    ),
                    rx.fragment(),  # Empty placeholder for false branch
                ),
                # Messages Area
                rx.scroll_area(
                    rx.vstack(
                        rx.foreach(ChatState.messages, message_bubble),
                        rx.cond(
                            ChatState.is_loading,
                            rx.hstack(
                                rx.text(
                                    "Gemma is thinking...",
                                    font_size="0.85em",
                                    color="#666",
                                    font_style="italic",
                                ),
                                spacing="2",
                            ),
                            rx.fragment(),
                        ),
                        spacing="0",
                        padding="16px",
                        width="100%",
                        align_items="stretch",
                    ),
                    height="350px",
                    width="100%",
                ),
                # Input Area - Conditional based on model loaded state
                rx.cond(
                    ChatState.model_loaded,
                    # Model is loaded - show chat input
                    rx.box(
                        rx.hstack(
                            rx.input(
                                placeholder="Ask about plant care...",
                                value=ChatState.input_text,
                                on_change=ChatState.set_input_text,
                                border="1px solid #e5e7eb",
                                border_radius="10px",
                                padding="10px 14px",
                                width="100%",
                                font_size="0.95em",
                                background="#fff",
                                _focus={
                                    "border_color": "#22c55e",
                                    "box_shadow": "0 0 0 2px rgba(34, 197, 94, 0.1)",
                                },
                            ),
                            rx.button(
                                "Send",
                                on_click=ChatState.handle_submit,
                                background="#22c55e",
                                border_radius="10px",
                                padding="10px",
                                _hover={"background": "#16a34a"},
                                color="white",
                            ),
                            width="100%",
                            padding="12px 16px",
                            background="#f9fafb",
                            border_radius="0 0 12px 12px",
                            border_top="1px solid #f3f4f6",
                        ),
                        width="100%",
                    ),
                    # Model not loaded - show Load Gemma button or loading state
                    rx.cond(
                        ChatState.model_loading,
                        # Model is loading - show progress
                        rx.box(
                            rx.vstack(
                                rx.text(
                                    ChatState.loading_progress,
                                    font_size="0.85em",
                                    color="#666",
                                    text_align="center",
                                ),
                                rx.box(
                                    width="100%",
                                    height="6px",
                                    background="#eee",
                                    border_radius="3px",
                                    overflow="hidden",
                                    position="relative",
                                ),
                                spacing="2",
                                width="100%",
                            ),
                            padding="16px",
                            background="#f9fafb",
                            border_radius="0 0 12px 12px",
                            width="100%",
                        ),
                        # Model not loaded and not loading - show Load button
                        rx.box(
                            rx.button(
                                "🤖 Load Gemma AI",
                                on_click=ChatState.load_gemma,
                                background="linear-gradient(135deg, #22c55e, #16a34a)",
                                color="white",
                                width="100%",
                                padding="12px 16px",
                                border_radius="10px",
                                font_weight="600",
                                cursor="pointer",
                                _hover={
                                    "transform": "scale(1.02)",
                                    "box_shadow": "0 4px 12px rgba(34, 197, 94, 0.3)",
                                },
                                transition="all 0.2s ease",
                            ),
                            padding="12px 16px",
                            background="#f9fafb",
                            border_radius="0 0 12px 12px",
                            width="100%",
                        ),
                    ),
                ),
                spacing="0",
                width="100%",
            ),
            position="fixed",
            bottom="100px",
            right="24px",
            width="350px",
            background="white",
            border_radius="12px",
            box_shadow="0 10px 25px rgba(0,0,0,0.15)",
            z_index="1000",
            display=rx.cond(ChatState.is_open, "block", "none"),
            border="1px solid #eee",
            transition="all 0.3s ease",
            class_name="chat-window-animation",
        ),
    )
