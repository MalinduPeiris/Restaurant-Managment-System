# Repository Guidelines

## Project Structure & Module Organization
This workspace contains two Node-based apps plus planning docs. `crown-oven-frontend/` is an Expo React Native client; most feature code lives under `src/` with `screens/`, `components/common/`, `navigation/`, `services/`, `context/`, and `constants/`. `crown-oven-backend/` is an Express API with `routes/`, `controllers/`, `models/`, `middleware/`, `config/`, and `utils/`. Design and implementation notes belong in `docs/plans/`.

## Build, Test, and Development Commands
Run commands from the relevant app folder, not the workspace root.

- `cd crown-oven-frontend && npm start`: start the Expo dev server.
- `cd crown-oven-frontend && npm run android`: launch the Android target.
- `cd crown-oven-backend && npm start`: run the API with `nodemon`.
- `cd crown-oven-backend && npm run prod`: run the API with plain Node.
- `cd crown-oven-backend && node seed.js`: seed MongoDB with the default admin and sample data.

## Coding Style & Naming Conventions
Follow the existing JavaScript style: ES modules, double quotes, semicolons, and 2-space indentation. Use `PascalCase` for React components, contexts, models, and screen files such as `ManageOrdersScreen.js`. Use `camelCase` for services, helpers, and controllers such as `orderService.js` and `dashboardController.js`. Keep API route modules aligned with their controller and model names.

## Testing Guidelines
There is no project test runner configured yet in either `package.json`. Until one is added, verify changes with focused manual checks: exercise the affected mobile flow in Expo, call the related backend endpoint, and confirm seeded data still works. When adding tests, keep them outside `node_modules/`, mirror the source area they cover, and use `*.test.js` naming.

## Commit & Pull Request Guidelines
No `.git` history is available in this workspace snapshot, so use a clear conventional format moving forward: `feat: add room booking filters`, `fix: guard invalid payment status`. Keep each commit scoped to one concern. Pull requests should include a short summary, touched areas (`frontend`, `backend`, or both), setup or migration notes, linked issues, and screenshots or API examples for UI or contract changes.

## Security & Configuration Tips
Do not commit `.env` values. The backend expects `MONGODB_URI`, and Cloudinary settings may also be required. The frontend API client currently hard-codes a LAN base URL in `src/constants/api.js`; update it for your local network before testing on device.
