# 📚 BooxClash Learn

**BooxClash Learn** transforms boring lessons into **epic quests**. It’s an interactive learning platform where students master subjects through **games, challenges, and quests** that boost retention, engagement, and fun.

---

## 🚀 Features

* 🎮 **Gamified Learning** – Lessons are turned into quests, challenges, and achievements.
* 📊 **Progress Tracking** – Students see their growth with visual dashboards.
* 🌍 **Multi-Subject Support** – Supports Math, Science, and other subjects.
* 📱 **Responsive Design** – Works across desktop, tablet, and mobile.
* 🔒 **User Roles** – Separate dashboards for **students, teachers, and admins**.
* ⚡ **Offline Mode (PWA)** – Learn even without internet.

---

## 🛠️ Tech Stack

* **Frontend:** React, TailwindCSS, React Router
* **Backend:** Node.js, Express, MongoDB
* **Authentication:** JWT-based auth with role-based access
* **Deployment:** Vercel (Frontend) & Render/Google Cloud (Backend)
* **Other:** Service Workers for PWA, Charting with Recharts

---

## 📂 Project Structure

```bash
booxclash-learn/
├── frontend/          # React frontend (Student, Teacher, Admin dashboards)
├── backend/           # Node.js + Express API
├── docs/              # Documentation
├── .env.example       # Example environment variables
└── README.md          # You are here
```

---

## ⚙️ Installation & Setup

### Prerequisites

* Node.js (v18+ recommended)
* MongoDB (local or Atlas)

### Steps

1. Clone the repo:

   ```bash
   git clone https://github.com/yourusername/booxclash-learn.git
   cd booxclash-learn
   ```

2. Setup **backend**:

   ```bash
   cd backend
   cp .env.example .env   # Add your DB + JWT keys
   npm install
   npm run dev
   ```

3. Setup **frontend**:

   ```bash
   cd frontend
   npm install
   npm start
   ```

4. Visit app at:
   👉 `http://localhost:3000`

---

## 🔑 Environment Variables

### Backend (`.env`)

```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
```

### Frontend (`.env`)

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📸 Screenshots

### Student Dashboard

*(screenshot placeholder)*

### Teacher Dashboard

*(screenshot placeholder)*

---

## 🛡️ License

This project is licensed under the **MIT License**.

---

## 🤝 Contributing

Contributions are welcome! Please fork the repo and submit a pull request.

1. Fork the project
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👨‍💻 Authors

* **Kondwani Chilongo** – *Lead Developer*
* Contributions from the open-source community
