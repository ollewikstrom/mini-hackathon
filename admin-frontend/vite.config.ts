import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as dotenv from "dotenv";
// https://vite.dev/config/

dotenv.config();

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			events: "eventemitter3",
		},
	},
	define: {
		"process.env": process.env,
	},
});
