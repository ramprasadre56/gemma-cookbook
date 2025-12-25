import reflex as rx
from heartyculturenursery.state import ChatState


def hero() -> rx.Component:
    return rx.box(
        rx.vstack(
            rx.heading(
                "Buy Online: Greenery at Your Fingertips",
                size="8",
                color="white",
                text_align="center",
                font_weight="bold",
            ),
            rx.text(
                "Browse, select, and purchase your favorite plants from the comfort of your home.",
                size="4",
                color="white",
                text_align="center",
                margin_top="0.5em",
            ),
            rx.hstack(
                rx.button(
                    "Order Now",
                    background_color="#ffd700",  # Yellow
                    color="black",
                    font_weight="bold",
                    padding="1em 2em",
                    border_radius="5px",
                    _hover={"background_color": "#e6c200"},
                ),
                rx.button(
                    rx.hstack(
                        rx.icon("sparkles", size=18, color="#1a1a1a"),
                        rx.text("Chat with Gemini", color="#0b57d0", font_weight="600"),
                        spacing="2",
                        align="center",
                    ),
                    on_click=ChatState.open_chat,
                    background_color="#f0f4f9",
                    padding="0.8em 1.5em",
                    border_radius="25px",  # Pill shape
                    _hover={"background_color": "#dfe3e7", "transform": "scale(1.02)"},
                    transition="all 0.2s ease",
                ),
                spacing="4",
                margin_top="1.5em",
                align="center",
            ),
            align_items="center",
            justify="center",
            height="100%",
            width="100%",
            background_color="rgba(0, 0, 0, 0.4)",  # Dark overlay
        ),
        # Navigation arrows
        rx.icon(
            "chevron-left",
            color="white",
            size=40,
            position="absolute",
            left="20px",
            top="50%",
            transform="translateY(-50%)",
            cursor="pointer",
        ),
        rx.icon(
            "chevron-right",
            color="white",
            size=40,
            position="absolute",
            right="20px",
            top="50%",
            transform="translateY(-50%)",
            cursor="pointer",
        ),
        # Pagination dots (simplified)
        rx.hstack(
            rx.box(
                width="10px",
                height="10px",
                border_radius="50%",
                background_color="white",
            ),
            rx.box(
                width="8px",
                height="8px",
                border_radius="50%",
                background_color="rgba(255,255,255,0.5)",
            ),
            rx.box(
                width="8px",
                height="8px",
                border_radius="50%",
                background_color="rgba(255,255,255,0.5)",
            ),
            position="absolute",
            bottom="20px",
            left="50%",
            transform="translateX(-50%)",
            spacing="2",
        ),
        width="100%",
        height="600px",
        background_image="url('https://images.unsplash.com/photo-1463936575829-25148e1db1b8?q=80&w=2090&auto=format&fit=crop')",  # Placeholder plant image
        background_size="cover",
        background_position="center",
        position="relative",
    )
