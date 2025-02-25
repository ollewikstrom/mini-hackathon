import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router";
import FlipCard from "../components/FlipCard";
import ChatBubble from "../components/ChatBubble";
import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";
import { judgeAvatar } from "./MainScreen";

interface Answer {
	playerName: string;
	answer: string;
	aiAnswerId: string;
}

interface Response {
	id: string;
	gameId: string;
	playerId: string;
	playerName: string;
	questionId: number;
	question: string;
	assistantPrompt: string;
	answer: string;
	timestamp: string;
	avatar?: string; // New field for avatar
}

interface AnswersData {
	expectedTotal: number;
	gameId: string;
	message: string;
	processedCount: number;
	responses: Response[];
	totalPlayers: number;
	totalQuestions: number;
}

interface Judgement {
	id: string;
	gameId: string;
	aiAnswerId: string;
	playerId: string;
	playerName: string;
	questionId: number;
	clarityScore: number;
	contextScore: number;
	technicalScore: number;
	totalScore: number;
	justification: string;
	timestamp: string;
}

interface JudgementsData {
	gameId: string;
	judgements: Judgement[];
	message: string;
	processedCount: number;
}

interface PlayerScore {
	playerName: string;
	playerId: string;
	totalScore: number;
	judgementCount: number;
	averageScore: number;
	avatar?: string;
}

// Combined type to associate responses with their judgements
interface AnswerWithJudgement {
	response: Response;
	judgement: Judgement | null;
	isFlipped: boolean;
}

type Phase = "start" | "question" | "answers" | "judgements" | "leaderboard";

export default function ResultScreen() {
	const { gameId } = useParams<{ gameId: string }>();
	const [answers, setAnswers] = useState<AnswersData | null>(null);
	const [judgements, setJudgements] = useState<JudgementsData | null>(null);
	const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(
		null
	);
	const [showingPhase, setShowingPhase] = useState<Phase>("start");
	const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
	const [startTime, setStartTime] = useState<number>(Date.now());
	const [questionIds, setQuestionIds] = useState<Set<number>>(new Set());
	const [answerCards, setAnswerCards] = useState<AnswerWithJudgement[]>([]);
	const [allCardsFlipped, setAllCardsFlipped] = useState<boolean>(false);
	const flipTimerRef = useRef<NodeJS.Timeout | null>(null);

	const generateAnswers = async (): Promise<void> => {
		try {
			const response = await fetch(
				`${process.env.API_URL}/generateAnswers?gameId=${gameId}`
			);
			const data: AnswersData = await response.json();

			// Add avatars to each response
			const responsesWithAvatars = data.responses.map((response) => ({
				...response,
				avatar: createAvatar(bottts, {
					size: 128,
					seed: response.playerId,
				}).toDataUri(),
			}));

			data.responses = responsesWithAvatars;

			// Create Set of question IDs
			const ids = new Set<number>();
			data.responses.forEach((response) => {
				ids.add(response.questionId);
			});
			setQuestionIds(ids);
			setCurrentQuestionId(Math.min(...Array.from(ids))); // Set to lowest ID
			setAnswers(data);
		} catch (error) {
			alert(`Error: ${error}`);
		}
	};

	const generateJudgements = async (): Promise<void> => {
		try {
			const response = await fetch(
				`${process.env.API_URL}/generateJudgements?gameId=${gameId}`
			);
			const data: JudgementsData = await response.json();
			setJudgements(data);
		} catch (error) {
			alert(`Error: ${error}`);
		}
	};

	const getResults = async (): Promise<void> => {
		await generateAnswers();
		await generateJudgements();
	};

	useEffect(() => {
		getResults();
		setStartTime(Date.now());
	}, [gameId]);

	// Calculate player scores
	useEffect(() => {
		if (!judgements?.judgements || !answers?.responses) return;

		const scoreMap = new Map<string, PlayerScore>();

		judgements.judgements.forEach((judgement) => {
			if (!scoreMap.has(judgement.playerId)) {
				// Find player's avatar from responses
				const playerResponse = answers.responses.find(
					(r) => r.playerId === judgement.playerId
				);

				scoreMap.set(judgement.playerId, {
					playerName: judgement.playerName,
					playerId: judgement.playerId,
					totalScore: 0,
					judgementCount: 0,
					averageScore: 0,
					avatar: playerResponse?.avatar,
				});
			}

			const playerScore = scoreMap.get(judgement.playerId)!;
			playerScore.totalScore += judgement.totalScore;
			playerScore.judgementCount += 1;
			playerScore.averageScore =
				playerScore.totalScore / playerScore.judgementCount;
		});

		const scores = Array.from(scoreMap.values()).sort(
			(a, b) => b.averageScore - a.averageScore
		);
		setPlayerScores(scores);
	}, [judgements, answers]);

	// Prepare answer cards with judgements
	useEffect(() => {
		if (
			!currentQuestionId ||
			!answers?.responses ||
			!judgements?.judgements
		)
			return;

		const currentResponses = answers.responses.filter(
			(r) => r.questionId === currentQuestionId
		);

		const currentJudgements = judgements.judgements.filter(
			(j) => j.questionId === currentQuestionId
		);

		// Associate each response with its judgement
		const cards = currentResponses.map((response) => {
			const judgement =
				currentJudgements.find((j) => j.aiAnswerId === response.id) ||
				null;

			return {
				response,
				judgement,
				isFlipped: false,
			};
		});

		setAnswerCards(cards);
		setAllCardsFlipped(false);
	}, [currentQuestionId, answers, judgements]);

	// Setup sequential card flipping when entering judgements phase
	useEffect(() => {
		if (showingPhase === "judgements" && !allCardsFlipped) {
			// Start at -1 so the first increment puts us at index 0
			let index = -1;

			if (flipTimerRef.current) {
				clearInterval(flipTimerRef.current);
			}

			// Reset all cards to unflipped state first
			setAnswerCards((prev) =>
				prev.map((card) => ({ ...card, isFlipped: false }))
			);

			flipTimerRef.current = setInterval(() => {
				index++;

				if (index < answerCards.length) {
					setAnswerCards((prev) => {
						return prev.map((card, i) => {
							if (i === index) {
								return { ...card, isFlipped: true };
							}
							return card;
						});
					});
				} else {
					if (flipTimerRef.current) {
						clearInterval(flipTimerRef.current);
						setAllCardsFlipped(true);
					}
				}
			}, 800); // Flip one card every 800ms

			return () => {
				if (flipTimerRef.current) {
					clearInterval(flipTimerRef.current);
				}
			};
		}
	}, [showingPhase, answerCards.length, allCardsFlipped]);

	// Timer effect for automatic progression
	useEffect(() => {
		if (!answers?.responses?.length || !judgements?.judgements?.length)
			return;

		const timer = setInterval(
			() => {
				const currentTime = Date.now();

				if (showingPhase === "start") {
					if (currentTime - startTime >= 3000) {
						setShowingPhase("question");
					}
					return;
				}

				if (showingPhase === "question") {
					setShowingPhase("answers");
				} else if (showingPhase === "answers") {
					setShowingPhase("judgements");
				} else if (showingPhase === "judgements") {
					// Only move to next question when all cards have been flipped
					if (allCardsFlipped) {
						const sortedIds = Array.from(questionIds).sort(
							(a, b) => a - b
						);
						const currentIndex = sortedIds.indexOf(
							currentQuestionId!
						);

						if (currentIndex >= sortedIds.length - 1) {
							setShowingPhase("leaderboard");
						} else {
							setCurrentQuestionId(sortedIds[currentIndex + 1]);
							setShowingPhase("question");
						}
					}
				}
			},
			showingPhase === "start"
				? 3000
				: showingPhase === "judgements" && !allCardsFlipped
				? 10000
				: 5000
		);

		return () => clearInterval(timer);
	}, [
		showingPhase,
		currentQuestionId,
		answers,
		judgements,
		questionIds,
		startTime,
		allCardsFlipped,
	]);

	if (!answers?.responses || !judgements?.judgements) {
		return (
			<div className="flex items-center justify-center h-screen bg-gradient-to-r from-blue-500 to-purple-600">
				<div className="text-center text-white">
					<h1 className="text-5xl font-bold mb-4">
						Welcome to AI Arena
					</h1>
					<p className="text-2xl">Loading results...</p>
				</div>
			</div>
		);
	}

	// Get the question text from any response (they all have the same question)
	const currentQuestion = answerCards[0]?.response.question || "";

	const renderStart = () => (
		<div className="flex items-center justify-center h-screen bg-gradient-to-r from-purple-600 to-blue-600">
			<div className="text-center text-white">
				<h1 className="text-5xl font-bold mb-6">
					Get Ready For Results!
				</h1>
				<p className="text-2xl">The show is about to begin...</p>
				<div className="mt-8">
					<div className="animate-pulse w-16 h-16 mx-auto rounded-full bg-white bg-opacity-30"></div>
				</div>
			</div>
		</div>
	);

	const renderJudgeWithQuestion = () => (
		<div className="w-full max-w-3xl mx-auto mb-8">
			<div className="flex flex-col items-center">
				<div className="avatar flex flex-col items-center gap-4">
					<div className="ring-primary ring-offset-base-100 w-24 rounded-full ring ring-offset-2">
						<img src={judgeAvatar} alt="Mr Judge" />
					</div>
					<p className="text-xl font-semibold">Mr Judge</p>
				</div>

				<div className="mt-4 w-full">
					<ChatBubble
						position="top"
						content={
							<div>
								<div className="pb-2 border-b border-gray-200">
									<h2 className="text-2xl font-bold">
										Question{" "}
										{Array.from(questionIds)
											.sort((a, b) => a - b)
											.indexOf(currentQuestionId!) + 1}
									</h2>
								</div>
								<div className="pt-4">
									<p className="text-lg text-gray-700">
										{currentQuestion}
									</p>
								</div>
							</div>
						}
						backgroundColor="white"
						textColor="black"
						className="shadow-lg"
					/>
				</div>
			</div>
		</div>
	);

	const renderPlayersList = () => (
		<div className="w-full max-w-3xl mx-auto mb-8">
			<div className="flex flex-wrap justify-center gap-4">
				{answerCards.map((card) => (
					<div
						key={card.response.playerId}
						className="flex flex-col items-center"
					>
						<div className="w-16 h-16 rounded-full overflow-hidden ring-1 ring-gray-200">
							<img
								src={card.response.avatar}
								alt={`${card.response.playerName}'s avatar`}
							/>
						</div>
						<p className="text-sm font-medium mt-2">
							{card.response.playerName}
						</p>
					</div>
				))}
			</div>
		</div>
	);

	const renderAnswerBubbles = () => (
		<div className="space-y-8 w-full max-w-3xl mx-auto">
			{answerCards.map((card) => {
				// Front content - the answer (very simplified)
				const frontContent = (
					<div>
						<p style={{ margin: "10px 0" }}>
							{card.response.answer}
						</p>
					</div>
				);

				// Back content - the judgement (very simplified)
				const backContent = card.judgement ? (
					<div>
						<p
							style={{
								fontWeight: "bold",
								fontSize: "18px",
								marginBottom: "10px",
							}}
						>
							Score: {card.judgement.totalScore}
						</p>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr 1fr",
								gap: "8px",
								marginBottom: "10px",
							}}
						>
							<div>
								<p>Clarity: {card.judgement.clarityScore}</p>
							</div>
							<div>
								<p>Context: {card.judgement.contextScore}</p>
							</div>
							<div>
								<p>
									Technical: {card.judgement.technicalScore}
								</p>
							</div>
						</div>

						<p style={{ fontStyle: "italic" }}>
							{card.judgement.justification}
						</p>
					</div>
				) : (
					<div>
						<p>No judgement available</p>
					</div>
				);

				return (
					<div key={card.response.id} className="flex gap-4 mb-12">
						<div className="flex-shrink-0 w-14 flex flex-col items-center">
							<div className="w-12 h-12 rounded-full overflow-hidden">
								<img
									src={card.response.avatar}
									alt={`${card.response.playerName}'s avatar`}
								/>
							</div>
							<p className="text-xs text-center mt-1">
								{card.response.playerName}
							</p>
						</div>

						<div className="flex-grow">
							<FlipCard
								isFlipped={card.isFlipped}
								frontContent={frontContent}
								backContent={backContent}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);

	const renderLeaderboard = () => (
		<div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-3xl mx-auto">
			<div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
				<h2 className="text-3xl font-bold text-white text-center">
					Final Leaderboard
				</h2>
			</div>
			<div className="p-6">
				{playerScores.map((player, index) => (
					<div
						key={player.playerId}
						className={`${
							index === 0
								? "bg-yellow-50 border-2 border-yellow-400"
								: "bg-gray-50"
						} rounded-lg p-6 mb-4 transform transition-all ${
							index === 0 ? "scale-105" : ""
						}`}
					>
						<div className="flex justify-between items-center">
							<div className="flex items-center">
								<span
									className={`
					  ${index === 0 ? "text-yellow-500" : "text-gray-500"}
					  text-2xl font-bold mr-4
					`}
								>
									#{index + 1}
								</span>
								<div className="flex items-center gap-3">
									{player.avatar && (
										<div className="w-12 h-12 rounded-full overflow-hidden">
											<img
												src={player.avatar}
												alt={`${player.playerName}'s avatar`}
											/>
										</div>
									)}
									<div>
										<h3 className="text-xl font-bold">
											{player.playerName}
										</h3>
										<p className="text-gray-600">
											Total Score: {player.totalScore}
										</p>
									</div>
								</div>
							</div>
							<div className="text-right">
								<p className="text-2xl font-bold text-blue-600">
									{player.averageScore.toFixed(1)}
								</p>
								<p className="text-sm text-gray-500">
									avg. score
								</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);

	return (
		<div className="p-6 min-h-screen bg-gradient-to-b from-purple-50 to-blue-50">
			{showingPhase !== "start" && showingPhase !== "leaderboard" && (
				<div className="mb-4 flex justify-between items-center max-w-3xl mx-auto">
					<p className="text-sm text-gray-600">
						Question{" "}
						{Array.from(questionIds)
							.sort((a, b) => a - b)
							.indexOf(currentQuestionId!) + 1}{" "}
						of {questionIds.size}
					</p>
					<p className="text-sm text-gray-600">
						Showing:{" "}
						{showingPhase.charAt(0).toUpperCase() +
							showingPhase.slice(1)}
					</p>
				</div>
			)}

			{showingPhase === "start" && renderStart()}

			{showingPhase === "question" && (
				<>
					{renderJudgeWithQuestion()}
					{renderPlayersList()}
				</>
			)}

			{(showingPhase === "answers" || showingPhase === "judgements") && (
				<>
					{renderJudgeWithQuestion()}
					{renderAnswerBubbles()}
				</>
			)}

			{showingPhase === "leaderboard" && renderLeaderboard()}
		</div>
	);
}
