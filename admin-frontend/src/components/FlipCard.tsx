import React from "react";

interface FlipCardProps {
	isFlipped: boolean;
	frontContent: React.ReactNode;
	backContent: React.ReactNode;
}

const FlipCard: React.FC<FlipCardProps> = ({
	isFlipped,
	frontContent,
	backContent,
}) => {
	// Basic styles - no position: absolute that might be causing issues
	const styles = {
		container: {
			width: "100%",
			minHeight: "200px",
			perspective: "1000px",
		},
		card: {
			width: "100%",
			height: "100%",
			minHeight: "200px",
			transition: "transform 0.8s",
			transformStyle: "preserve-3d" as const,
			transform: isFlipped ? "rotateY(180deg)" : "none",
			position: "relative" as const,
		},
		front: {
			backgroundColor: "white",
			borderRadius: "0.5rem",
			padding: "1rem",
			boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
			backfaceVisibility: "hidden" as const,
			position: "absolute" as const,
			width: "100%",
			height: "100%",
			zIndex: isFlipped ? 0 : 1,
		},
		back: {
			backgroundColor: "#f0f7ff",
			borderRadius: "0.5rem",
			padding: "1rem",
			boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
			backfaceVisibility: "hidden" as const,
			position: "absolute" as const,
			width: "100%",
			height: "100%",
			transform: "rotateY(180deg)",
			zIndex: isFlipped ? 1 : 0,
		},
	};

	return (
		<div style={styles.container}>
			<div style={styles.card}>
				<div style={styles.front} className="front">
					{frontContent}
				</div>
				<div style={styles.back} className="back">
					{backContent}
				</div>
			</div>
		</div>
	);
};

export default FlipCard;
