import React, { useEffect, useState } from "react";
import { useParams } from "react-router";

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

	const generateAnswers = async (): Promise<void> => {
		try {
			const response = await fetch(
				`${process.env.API_URL}/generateAnswers?gameId=${gameId}`
			);
			const data: AnswersData = await response.json();

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
		if (!judgements?.judgements) return;

		const scoreMap = new Map<string, PlayerScore>();

		judgements.judgements.forEach((judgement) => {
			if (!scoreMap.has(judgement.playerId)) {
				scoreMap.set(judgement.playerId, {
					playerName: judgement.playerName,
					playerId: judgement.playerId,
					totalScore: 0,
					judgementCount: 0,
					averageScore: 0,
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
	}, [judgements]);

	// Timer effect for automatic progression
	useEffect(() => {
		if (!answers?.responses?.length || !judgements?.judgements?.length)
			return;

		const timer = setInterval(
			() => {
				const currentTime = Date.now();

				if (showingPhase === "start") {
					if (currentTime - startTime >= 3000) {
						// Reduced to 3 seconds
						setShowingPhase("question");
					}
					return;
				}

				if (showingPhase === "question") {
					setShowingPhase("answers");
				} else if (showingPhase === "answers") {
					setShowingPhase("judgements");
				} else if (showingPhase === "judgements") {
					const sortedIds = Array.from(questionIds).sort(
						(a, b) => a - b
					);
					const currentIndex = sortedIds.indexOf(currentQuestionId!);

					if (currentIndex >= sortedIds.length - 1) {
						setShowingPhase("leaderboard");
					} else {
						setCurrentQuestionId(sortedIds[currentIndex + 1]);
						setShowingPhase("question");
					}
				}
			},
			showingPhase === "start" ? 3000 : 5000
		); // Changed start phase timer to 3 seconds

		return () => clearInterval(timer);
	}, [
		showingPhase,
		currentQuestionId,
		answers,
		judgements,
		questionIds,
		startTime,
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

	// Get all responses for the current question
	const currentResponses = currentQuestionId
		? answers.responses.filter((r) => r.questionId === currentQuestionId)
		: [];

	// Get the question text from any response (they all have the same question)
	const currentQuestion = currentResponses[0]?.question || "";

	// Get judgements for the current question
	const currentJudgements = currentQuestionId
		? judgements.judgements.filter(
				(j) => j.questionId === currentQuestionId
		  )
		: [];

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

	const renderQuestion = () => (
		<div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-2xl mx-auto">
			<div className="p-6 border-b border-gray-200">
				<h2 className="text-2xl font-bold">
					Question{" "}
					{Array.from(questionIds)
						.sort((a, b) => a - b)
						.indexOf(currentQuestionId!) + 1}
				</h2>
			</div>
			<div className="p-6">
				<p className="text-lg text-gray-700">{currentQuestion}</p>
			</div>
		</div>
	);

	const renderAnswers = () => (
		<div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-2xl mx-auto">
			<div className="p-6 border-b border-gray-200">
				<h2 className="text-2xl font-bold">Answers</h2>
			</div>
			<div className="p-6">
				<div className="space-y-4">
					{currentResponses.map((response) => (
						<div
							key={response.id}
							className="bg-gray-50 rounded-lg p-4"
						>
							<p className="font-semibold text-gray-800">
								{response.playerName}
							</p>
							<p className="text-gray-600 mt-2">
								{response.answer}
							</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);

	const renderJudgements = () => (
		<div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-2xl mx-auto">
			<div className="p-6 border-b border-gray-200">
				<h2 className="text-2xl font-bold">Judgements</h2>
			</div>
			<div className="p-6">
				<div className="space-y-6">
					{currentJudgements.map((judgement) => (
						<div
							key={judgement.id}
							className="bg-gray-50 rounded-lg p-4"
						>
							<div className="flex justify-between mb-2">
								<p className="font-semibold text-gray-800">
									{judgement.playerName}
								</p>
								<p className="font-bold text-gray-800">
									Total Score: {judgement.totalScore}
								</p>
							</div>
							<div className="grid grid-cols-3 gap-2 mb-2">
								<div>
									<p className="text-sm text-gray-600">
										Clarity
									</p>
									<p className="font-medium text-gray-800">
										{judgement.clarityScore}
									</p>
								</div>
								<div>
									<p className="text-sm text-gray-600">
										Context
									</p>
									<p className="font-medium text-gray-800">
										{judgement.contextScore}
									</p>
								</div>
								<div>
									<p className="text-sm text-gray-600">
										Technical
									</p>
									<p className="font-medium text-gray-800">
										{judgement.technicalScore}
									</p>
								</div>
							</div>
							<p className="text-sm text-gray-600 mt-2">
								{judgement.justification}
							</p>
						</div>
					))}
				</div>
			</div>
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
								<div>
									<h3 className="text-xl font-bold">
										{player.playerName}
									</h3>
									<p className="text-gray-600">
										Total Score: {player.totalScore}
									</p>
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
		<div className="p-6">
			{showingPhase !== "start" && showingPhase !== "leaderboard" && (
				<div className="mb-4 flex justify-between items-center max-w-2xl mx-auto">
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
			{showingPhase === "question" && renderQuestion()}
			{showingPhase === "answers" && renderAnswers()}
			{showingPhase === "judgements" && renderJudgements()}
			{showingPhase === "leaderboard" && renderLeaderboard()}
		</div>
	);
}
