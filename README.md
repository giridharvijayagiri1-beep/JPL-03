# 🏏 JPL-03 Cricket Web Application

JPL-03 is a premium, real-time cricket tournament management application designed specifically for mobile devices. Built for the Jammikunta City cricket league, it provides a seamless experience for both administrators and fans.

## 🚀 Features

- **Live Scoreboard**: Real-time ball-by-ball updates with automatic synchronization.
- **Admin Control Panel**: Easy-to-use interface for updating runs, wickets, and match events.
- **Points Table**: Automated standings with NRR (Net Run Rate) and tie-breaking logic.
- **Premium UI**: Modern, Apple-inspired design with infinite scrolling carousels and smooth animations.
- **Dynamic Analytics**: Real-time Run Rate (CRR/RRR) calculations during live matches.

## 🛠 Tech Stack

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Hosting**: [Firebase Hosting](https://firebase.google.com/docs/hosting)

---

## 💻 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/giridharvijayagiri1-beep/JPL-03.git
   cd jpl-03
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

### Building for Production

To create a production-ready build in the `dist/` folder:
```bash
npm run build
```

---

## 🌐 Deployment

This project is configured for **Firebase Hosting** with **GitHub Actions** for automatic deployment whenever code is pushed to the `main` branch.

### Deployment Configuration
- **Build Folder**: `dist`
- **Build Command**: `npm run build`
- **Configuration**: `firebase.json`

---

## 📂 Project Structure

- `src/`: Main source code (Components, Pages, Services).
- `public/`: Static assets (Images, Icons).
- `scripts/`: Utility and database management scripts.
- `firebase.json`: Hosting configuration.
- `.gitignore`: Files excluded from version control.

---

## ⚖️ License

Distributed under the MIT License.

---

**Developed by Giridhar V**
