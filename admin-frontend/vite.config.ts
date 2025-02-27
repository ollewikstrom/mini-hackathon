import * as dotenv from "dotenv";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
// https://vite.dev/config/

dotenv.config();

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "dist",
		minify: "terser",
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ["react", "react-dom"],
					// add other large dependencies here
				},
			},
		},
		chunkSizeWarningLimit: 1000,
	},
	resolve: {
		alias: {
			events: "eventemitter3",
			"@": resolve(__dirname, "src"),
		},
	},
	define: {
		"process.env": process.env,
	},
});
