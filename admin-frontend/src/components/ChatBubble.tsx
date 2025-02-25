import React from "react";

interface ChatBubbleProps {
	content: React.ReactNode;
	position: "left" | "right" | "top" | "bottom";
	backgroundColor?: string;
	textColor?: string;
	width?: string;
	className?: string;
}

export default function ChatBubble({
	content,
	position,
	backgroundColor = "white",
	textColor = "black",
	width = "100%",
	className = "",
}: ChatBubbleProps) {
	// Determine arrow position CSS
	// Base bubble style
	const bubbleStyle: React.CSSProperties = {
		position: "relative",
		padding: "1rem",
		borderRadius: "0.5rem",
		boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
		backgroundColor: backgroundColor,
		color: textColor,
		width: width,
	};

	// Arrow position styles
	let arrowStyle: React.CSSProperties = {};

	// Generate pseudo-element for arrow using a separate div
	let arrowElement = null;

	if (position === "left") {
		arrowStyle = {
			position: "absolute",
			left: "-10px",
			top: "20px",
			width: "0",
			height: "0",
			borderTop: "10px solid transparent",
			borderBottom: "10px solid transparent",
			borderRight: `10px solid ${backgroundColor}`,
		};
	} else if (position === "right") {
		arrowStyle = {
			position: "absolute",
			right: "-10px",
			top: "20px",
			width: "0",
			height: "0",
			borderTop: "10px solid transparent",
			borderBottom: "10px solid transparent",
			borderLeft: `10px solid ${backgroundColor}`,
		};
	} else if (position === "top") {
		arrowStyle = {
			position: "absolute",
			top: "-10px",
			left: "50%",
			transform: "translateX(-50%)",
			width: "0",
			height: "0",
			borderLeft: "10px solid transparent",
			borderRight: "10px solid transparent",
			borderBottom: `10px solid ${backgroundColor}`,
		};
	} else if (position === "bottom") {
		arrowStyle = {
			position: "absolute",
			bottom: "-10px",
			left: "50%",
			transform: "translateX(-50%)",
			width: "0",
			height: "0",
			borderLeft: "10px solid transparent",
			borderRight: "10px solid transparent",
			borderTop: `10px solid ${backgroundColor}`,
		};
	}

	arrowElement = <div style={arrowStyle}></div>;

	// Combine any additional class names
	const classNames = `chat-bubble ${className}`;

	return (
		<div className={classNames} style={bubbleStyle}>
			{arrowElement}
			{content}
		</div>
	);
}
