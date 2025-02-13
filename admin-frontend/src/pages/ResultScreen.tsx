import { useEffect } from "react";
import { useParams } from "react-router";

export default function ResultScreen() {
	const { gameId } = useParams();
	console.log("Game id", gameId);

	useEffect(() => {
		const fetchResults = async () => {
			await fetch(
				`${process.env.API_URL}/generateAnswers?gameId=${gameId}`
			)
				.then((response) => response.json())
				.then((data) => {
					console.log("Results", data);
				})
				.catch((error) => {
					alert(`Error: ${error}`);
				});
		};

		fetchResults();
	}, [gameId]);

	return <div>Result Screen</div>;
}
