import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import logo from "./assets/logo.png";
import { Line } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);


function App() {
  const [selectedTest, setSelectedTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // NEW STATES FOR ATTEMPTS
  const [view, setView] = useState("menu"); // menu | exam | attempts | reviewAttempt | dashboard | charts | selectEditTest | editQuestions
  const [attempts, setAttempts] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [attemptDetails, setAttemptDetails] = useState([]);
  const [userId, setUserId] = useState(null);
  const [login, setLogin] = useState({ username: "", password: "" });

  // NEW STATES FOR EDITING QUESTIONS
  const [editingQuestionSet, setEditingQuestionSet] = useState([]); // Questions for editing
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [selectedNewAnswer, setSelectedNewAnswer] = useState(null); // The selected option text
  const [currentEditTestId, setCurrentEditTestId] = useState(null);

  // Dashboard & Chart
  const [summary, setSummary] = useState({
    attempts: 0,
    best: 0,
    average_score: 0
  });

  const [chartData, setChartData] = useState([]);
  const TEST_TITLES = {
    test1: "NACC Practice Test 1",
    test2: "NACC Practice Test 2",
    test3: "NACC Practice Test 3",
    test4: "NACC Practice Test 4",
    test5: "NACC Practice Test 5",
    test6: "NACC Practice Test 6",
    test7: "NACC Practice Test 7",
    test8: "NACC Practice Test 8",
    test9: "NACC Practice Test 9",
    test10: "NACC Practice Test 10",
    test11: "1~200(800 Questions)",
    test12: "201~400(800 Questions)",
    test13: "401~600(800 Questions)",
    test14: "601~800(800 Questions)"
  };


  useEffect(() => {
    if (!userId) return;

    axios.get(`http://localhost:5000/api/user/${userId}/summary`)
      .then(res => setSummary(res.data));
  }, [userId]);




  // Timer
  useEffect(() => {
    if (questions.length > 0) {
      setTimeLeft(questions.length * 45);
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [questions]);

  // Format timer
  const formatTime = (secs) => {
    const hrs = String(Math.floor(secs / 3600)).padStart(2, "0");
    const mins = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const secsRemaining = String(secs % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secsRemaining}`;
  };

  useEffect(() => {
    if (!userId) return;

    axios.get(`http://localhost:5000/api/user/${userId}/chart`)
      .then(res => setChartData(res.data));
  }, [userId]);


  // Fetch questions based on selected test
  useEffect(() => {
    if (!selectedTest) return;
    axios
      .get(`http://localhost:5000/api/${selectedTest}/questions`)
      .then((res) => {
        setQuestions(res.data);
        setAnswers({});
        setScore(null);
        setCurrentIndex(0);
      })
      .catch((err) => console.error(err));
  }, [selectedTest]);

  const handleAnswerChange = (qId, option) => {
    setAnswers({ ...answers, [qId]: option });
  };

  const handleSubmit = () => {
    axios
      .post(`http://localhost:5000/api/${selectedTest}/submit_exam`, { answers })
      .then((res) => setScore(res.data))
      .catch((err) => console.error(err));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  // --------------------------
  // EDITING HANDLERS
  // --------------------------
  const handleStartEditing = (testId) => {
    // Re-use the existing logic to fetch questions for a test
    setCurrentEditTestId(testId);
    axios
      .get(`http://localhost:5000/api/${testId}/questions`)
      .then((res) => {
        setEditingQuestionSet(res.data);
        setCurrentEditIndex(0);
        // Set the selected answer to the existing correct answer of the first question
        setSelectedNewAnswer(res.data[0].answer || null);
        setView("editQuestions");
      })
      .catch((err) => console.error("Error fetching questions for edit:", err));
  };

  const handleEditAnswerChange = (optionText) => {
    setSelectedNewAnswer(optionText);
  };

  const handleUpdateAnswer = async () => {
    const currentQuestion = editingQuestionSet[currentEditIndex];
    if (!selectedNewAnswer) {
      alert("Please select a correct answer option.");
      return;
    }

    try {
      const response = await axios.put(
        `http://localhost:5000/api/question/${currentQuestion.id}/update_answer`,
        {
          new_answer: selectedNewAnswer,
          test_id: currentEditTestId
        }
      );

      if (response.data.success) {
        alert("Answer updated successfully!");

        // Update the local state to reflect the change
        const updatedQuestions = editingQuestionSet.map((q, index) => {
          if (index === currentEditIndex) {
            return { ...q, answer: selectedNewAnswer };
          }
          return q;
        });
        setEditingQuestionSet(updatedQuestions);

        // Move to the next question
        handleNextEdit();

      } else {
        alert(`Failed to update answer: ${response.data.message}`);
      }
    } catch (error) {
      console.error("Error updating answer:", error);
      alert("An error occurred while updating the answer.");
    }
  };

  const handleNextEdit = () => {
    if (currentEditIndex < editingQuestionSet.length - 1) {
      const nextIndex = currentEditIndex + 1;
      const nextQuestion = editingQuestionSet[nextIndex];
      // Set the selected answer to the existing correct answer of the next question
      setSelectedNewAnswer(nextQuestion.answer || null);
      setCurrentEditIndex(nextIndex);
    } else {
      alert("Reached the end of the question set.");
    }
  };

  const handlePreviousEdit = () => {
    if (currentEditIndex > 0) {
      const prevIndex = currentEditIndex - 1;
      const prevQuestion = editingQuestionSet[prevIndex];
      // Set the selected answer to the existing correct answer of the previous question
      setSelectedNewAnswer(prevQuestion.answer || null);
      setCurrentEditIndex(prevIndex);
    }
  };

  // --------------------------
  // FETCH USER ATTEMPTS
  // --------------------------
  const fetchAttempts = () => {
    axios
      .get(`http://localhost:5000/api/user/${userId}/attempts`)
      .then((res) => {
        setAttempts(res.data);
        setView("attempts");
      })
      .catch((err) => console.error(err));
  };

  // --------------------------
  // FETCH DETAILS OF ONE ATTEMPT (FIXED)
  // --------------------------
  const fetchAttemptDetails = async (attemptId) => {
    try {
      setSelectedAttemptId(attemptId);

      // 1) Load attempt ANSWERS
      const detailsRes = await axios.get(
        `http://localhost:5000/api/attempt/${attemptId}/details`
      );
      setAttemptDetails(detailsRes.data);

      // 2) Get test_id for this attempt
      const infoRes = await axios.get(
        `http://localhost:5000/api/attempt/${attemptId}/info`
      );

      const testId = infoRes.data.test_id;  // example: "test1", "test2", "test3"

      // 3) Fetch correct question set for this attempt
      const qRes = await axios.get(
        `http://localhost:5000/api/${testId}/questions`
      );
      setQuestions(qRes.data);

      // 4) Show review page
      setView("reviewAttempt");

    } catch (error) {
      console.error("Error loading attempt details:", error);
    }
  };


  if (!userId) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <h2>Login</h2>
        <input
          placeholder="Username"
          value={login.username}
          onChange={(e) => setLogin({ ...login, username: e.target.value })}
          style={{ padding: 10, marginBottom: 10 }}
        /><br />

        <input
          placeholder="Password"
          type="password"
          value={login.password}
          onChange={(e) => setLogin({ ...login, password: e.target.value })}
          style={{ padding: 10, marginBottom: 10 }}
        /><br />

        <button
          className="button-primary"
          onClick={() => {
            axios.post("http://localhost:5000/api/login", login)
              .then(res => {
                if (res.data.success) {
                  setUserId(res.data.user_id);
                  setView("dashboard");
                } else {
                  alert(res.data.message);
                }
              });
          }}
        >
          Login
        </button>
      </div>
    );
  }

  if (view === "dashboard") {
    return (
      <div style={{ textAlign: "center", marginTop: "60px" }}>
        <h2>User Dashboard</h2>

        <p><b>Total Attempts:</b> {summary.attempts}</p>
        <p><b>Best Score:</b> {summary.best}</p>
        <p><b>Average Score:</b> {summary.average_score}</p>

        <button className="button-primary" onClick={() => setView("menu")}>
          📝 Take a Test
        </button>

        <button className="button-primary" style={{ marginLeft: 20 }} onClick={() => fetchAttempts()}>
          👁️ Review Past Attempts
        </button>

        {/* NEW BUTTON FOR EDITING */}
        <button className="button-primary" style={{ marginLeft: 20 }} onClick={() => setView("selectEditTest")}>
          ✍️ Edit Question Answers
        </button>

        <button className="button-primary" style={{ marginLeft: 20 }} onClick={() => setView("charts")}>
          📈 View Performance Chart
        </button>

        <button className="button-primary" style={{ marginLeft: 20 }} onClick={() => setUserId(null)}>
          ⏻ Logout
        </button>
      </div>
    );
  }

  if (view === "charts") {
    return (
      <div style={{ padding: 30 }}>
        <h2>Your Performance Over Time</h2>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button className="button-primary" onClick={() => setView("dashboard")}>
            🏠 Back to Dashboard
          </button>
        </div>


        <Line
          key="user-performance-chart"
          data={{
            labels: chartData.map(d =>
              new Date(d.attempt_time).toLocaleDateString()
            ),
            datasets: [
              {
                label: "Score",
                data: chartData.map(d => d.score),
                borderWidth: 3,
                tension: 0.3
              }
            ]
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { display: true },
              title: { display: true, text: "Performance Over Time" }
            },
            scales: {
              y: { beginAtZero: true }
            }
          }}
        />

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button className="button-primary" onClick={() => setView("dashboard")}>
            🏠 Back to Dashboard
          </button>
        </div>

      </div>
    );
  }

  // ------------------------
  // SELECT TEST FOR EDITING PAGE (NEW VIEW)
  // ------------------------
  if (view === "selectEditTest") {
    return (
      <div style={{ textAlign: "center", marginTop: "20px", backgroundColor: "#FAFAFA", color: "#222" }}>
        <h2 style={{ marginBottom: "20px" }}>Select a Practice Test to Edit Answers</h2>
        <p style={{ marginBottom: "30px" }}>Select a test to begin setting the correct answers for each question.</p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "space-between",
            maxWidth: "600px",
            margin: "0 auto"
          }}
        >
          {/* Dynamically create buttons based on TEST_TITLES */}
          {Object.keys(TEST_TITLES).map(testId => (
            <li key={testId} style={{ flex: '1 1 48%' }}>
              <button
                className="button-primary"
                onClick={() => handleStartEditing(testId)}
              >
                {TEST_TITLES[testId]}
              </button>
            </li>
          ))}
        </ul>

        <button
          className="button-primary"
          style={{ marginTop: "40px" }}
          onClick={() => setView("dashboard")}
        >
          🏠 Back to Dashboard
        </button>
      </div>
    );
  }

  // ------------------------
  // MENU PAGE (ADDED ATTEMPTS BUTTON)
  // ------------------------
  if (view === "menu") {
    return (
      <div style={{ textAlign: "center", marginTop: "20px", backgroundColor: "#FAFAFA", color: "#222" }}>

        <img src={logo} alt="Logo" style={{ height: "120px", marginBottom: "10px" }} />
        <h2>Select a Practice Test</h2>


        <ul
          style={{
            listStyle: "none",
            padding: 0,
            display: "flex",        // 1. Enable Flexbox
            flexWrap: "wrap",       // 2. Allow items to wrap to the next line
            gap: "10px",            // 3. Add space between rows/columns
            justifyContent: "space-between", // Optional: Distribute items nicely
          }}
        >
          {/* The list items will now be laid out side-by-side */}
          {/* The 'marginTop: "10px"' on subsequent buttons should be removed or moved to the parent LI for consistent spacing */}

          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test1"); setView("exam"); }}
            >
              NACC Practice Test 1
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}> {/* Use style for column width */}
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test2"); setView("exam"); }}
            >
              NACC Practice Test 2
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test3"); setView("exam"); }}
            >
              NACC Practice Test 3
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test4"); setView("exam"); }}
            >
              NACC Practice Test 4
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test5"); setView("exam"); }}
            >
              NACC Practice Test 5
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test6"); setView("exam"); }}
            >
              NACC Practice Test 6
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test7"); setView("exam"); }}
            >
              NACC Practice Test 7
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test8"); setView("exam"); }}
            >
              NACC Practice Test 8
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test9"); setView("exam"); }}
            >
              NACC Practice Test 9
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test10"); setView("exam"); }}
            >
              NACC Practice Test 10
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test11"); setView("exam"); }}
            >
              1~200(800 Questions)
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test12"); setView("exam"); }}
            >
              201~400(800 Questions)
            </button>
          </li>

          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test13"); setView("exam"); }}
            >
              401~600(800 Questions)
            </button>
          </li>
          <li style={{ flex: '1 1 48%' }}>
            <button
              className="button-primary"
              onClick={() => { setSelectedTest("test14"); setView("exam"); }}
            >
              601~800(800 Questions)
            </button>
          </li>
        </ul>

        <button
          className="button-primary"
          style={{ marginTop: "20px" }}
          onClick={() => setView("dashboard")}
        >
          🏠 Back to Dashboard
        </button>


        <footer
          style={{
            marginTop: "40px",
            padding: "10px",
            textAlign: "center",
            borderTop: "1px solid #ccc",
            fontSize: "20px",
            color: "#555",
          }}
        >
          Developed by Sanjoy Kumar Das
        </footer>
      </div>
    );
  }

  // -----------------------------------
  // QUESTION EDIT PAGE (NEW VIEW)
  // -----------------------------------
  if (view === "editQuestions") {
    if (editingQuestionSet.length === 0) return <p>Loading questions for edit...</p>;

    const currentQuestion = editingQuestionSet[currentEditIndex];

    return (
      <div style={{ padding: "20px" }}>
        <h2 style={{ textAlign: "center" }}>Edit Question Answer</h2>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            className="button-primary"
            onClick={() => setView("selectEditTest")}
            style={{ marginRight: "20px" }}
          >
            ⚙️ Change Test
          </button>
          <button className="button-primary" onClick={() => setView("dashboard")}>
            🏠 Back to Dashboard
          </button>
        </div>

        <p style={{ textAlign: "center", fontWeight: "bold" }}>
          Question {currentEditIndex + 1} of {editingQuestionSet.length}
        </p>

        <div style={{ margin: "20px auto", padding: "15px", border: "1px solid #ccc", backgroundColor: "#fff", maxWidth: "800px" }}>
          <p style={{ fontSize: "20px", marginBottom: "15px" }}>
            <b>Q{currentEditIndex + 1}. {currentQuestion.question}</b>
          </p>

          {/* Question Options */}
          {currentQuestion.options.map((opt, idx) => {
            const isNewAnswer = selectedNewAnswer === opt;
            const isExistingAnswer = currentQuestion.answer === opt;

            return (
              <label
                key={idx}
                style={{
                  display: "block",
                  margin: "8px 0",
                  fontSize: "18px",
                  padding: "10px",
                  border: isExistingAnswer && isNewAnswer ? "2px solid green" : isExistingAnswer ? "1px dashed #00b000" : isNewAnswer ? "2px solid #007bff" : "1px solid #eee",
                  backgroundColor: isNewAnswer ? "#e9f5ff" : isExistingAnswer ? "#e6ffe6" : "#fff",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                <input
                  type="radio"
                  name="newAnswer"
                  value={opt}
                  checked={isNewAnswer}
                  onChange={() => handleEditAnswerChange(opt)}
                  style={{ transform: "scale(1.2)", marginRight: "10px", cursor: "pointer" }}
                />
                {String.fromCharCode(97 + idx)}) {opt}
                {isExistingAnswer && " (Current Correct Answer)"}
                {isNewAnswer && !isExistingAnswer && " (Selected as New Correct Answer)"}
              </label>
            );
          })}
        </div>

        {/* Control Buttons */}
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            onClick={handlePreviousEdit}
            className="button-primary"
            style={{ marginRight: "20px" }}
            disabled={currentEditIndex === 0}
          >
            ⬅️ Previous
          </button>

          <button
            onClick={handleNextEdit}
            className="button-primary"
            style={{ marginRight: "20px" }}
            disabled={currentEditIndex === editingQuestionSet.length - 1}
          >
            Next ➡️
          </button>

          <button
            onClick={handleUpdateAnswer}
            className="button-primary"
            style={{ marginRight: "20px" }}
          >
            💾 Update Answer
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------
  // PAST ATTEMPTS PAGE
  // -----------------------------------
  if (view === "attempts") {
    return (
      <div style={{ padding: "20px" }}>
        <h2 style={{ textAlign: "center", padding: 0 }}>Your Past Attempts</h2>
        <div style={{ textAlign: "center" }}>
          <button className="button-primary" onClick={() => setView("dashboard")}>
            🏠 Back to Dashboard
          </button>
        </div>


        {attempts.length === 0 ? (
          <p>No attempts found.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {attempts.map((a) => (
              <li key={a.id} style={{ padding: 15, border: "1px solid #ccc", marginTop: 10 }}>
                <p><b>Test:</b> {a.test_id}</p>
                <p><b>Date:</b> {new Date(a.attempt_time).toLocaleString()}</p>
                <p><b>Score:</b> {a.score} / {a.total_questions}</p>

                <button
                  className="button-primary"
                  onClick={() => fetchAttemptDetails(a.id)}
                >
                  Review Attempt
                </button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ textAlign: "center" }}>
          <button className="button-primary" onClick={() => setView("dashboard")}>
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------
  // ATTEMPT REVIEW PAGE
  // -----------------------------------
  if (view === "reviewAttempt") {
    return (
      <div style={{ padding: "20px" }}>
        <h2 style={{ textAlign: "center" }}>Attempt Review</h2>
        <button className="button-primary" onClick={() => setView("attempts")}>
          Back to Attempts
        </button>

        <button style={{ marginLeft: "15px" }} className="button-primary" onClick={() => setView("dashboard")}>
          🏠 Back to Dashboard
        </button>

        {questions.map((q, idx) => {
          const result = attemptDetails.find((item) => item.question_id === q.id);

          return (
            <div key={q.id} style={{ margin: "20px 0", padding: "15px", border: "1px solid #ccc" }}>
              <p><b>Q{idx + 1}. {q.question}</b></p>

              {q.options.map((opt, i) => {
                const isUser = result?.user_answer === opt;
                const isCorrect = result?.correct_answer === opt;

                return (
                  <p key={i} style={{
                    fontSize: "18px",
                    color: isCorrect ? "green" : isUser ? "red" : "black"
                  }}>
                    {String.fromCharCode(97 + i)}) {opt}
                    {isCorrect && " ✔ Correct"}
                    {isUser && !isCorrect && " ✘ Your Answer"}
                  </p>
                );
              })}
            </div>
          );
        })}

        <button className="button-primary" onClick={() => setView("attempts")}>
          Back to Attempts
        </button>

        <button style={{ marginLeft: "15px" }} className="button-primary" onClick={() => setView("dashboard")}>
          🏠 Back to Dashboard
        </button>
      </div>
    );
  }

  // ------------------------
  // Exam Page
  // ------------------------
  if (questions.length === 0) return <p>Loading questions...</p>;

  const currentQuestion = questions[currentIndex];

  return (
    <div className="App" style={{ margin: "0 auto", padding: "20px", backgroundColor: "#FAFAFA", color: "#222" }}>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        {/* Left: Logo */}
        <div style={{ flex: 1, textAlign: "left" }}>
          <img src={logo} alt="Sanjoy Kumar Das Logo" style={{ height: "100px" }} />
        </div>

        {/* Center: Title */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "28px" }}>
            {TEST_TITLES[selectedTest] || "NACC Test Title"}
          </h2>
        </div>

        {/* Right */}
        <div style={{ flex: 1, textAlign: "right" }}>
          <button className="button-primary" onClick={() => setView("dashboard")}>
            🏠 Back to Dashboard
          </button>

        </div>
      </div>

      {/* Dashboard */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
        {questions.map((q, idx) => {
          const answered = answers[q.id];
          return (
            <div
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: "30px",
                height: "30px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                backgroundColor: answered ? "green" : "red",
                color: "white",
                fontWeight: "bold",
                fontSize: "15px",
                borderRadius: "4px",
                textDecoration: answered ? "none" : "line-through",
                border: idx === currentIndex ? "3px solid #000" : "none",
              }}
            >
              {idx + 1}
            </div>
          );
        })}
      </div>

      {/* Exam */}
      {!score ? (
        <div style={{ textAlign: "justify", marginLeft: "50px", marginRight: "50px" }}>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "18px",
              marginBottom: "10px",
            }}
          >
            <strong>
              Question {currentIndex + 1} of {questions.length}
            </strong>
            <span>
              Time Left: <b style={{ fontSize: "24px" }}>{formatTime(timeLeft)}</b>
            </span>
          </div>

          <p style={{ fontSize: "20px", marginBottom: "10px" }}>{currentQuestion.question}</p>

          {currentQuestion.options.map((opt, idx) => {
            const optionLabel = String.fromCharCode(97 + idx);
            return (
              <label key={idx} style={{ display: "block", margin: "4px 0", fontSize: "20px" }}>
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={opt}
                  checked={answers[currentQuestion.id] === opt}
                  onChange={() => handleAnswerChange(currentQuestion.id, opt)}
                  style={{ transform: "scale(1.3)", marginRight: "10px", cursor: "pointer" }}
                />
                {`${optionLabel}) ${opt}`}
              </label>
            );
          })}

          <div style={{ marginTop: "10px", textAlign: "center" }}>
            {currentIndex > 0 && (
              <button onClick={handlePrevious} className="button-primary" style={{ marginRight: "20px" }}>
                ⬅️ Previous
              </button>
            )}
            {currentIndex < questions.length - 1 ? (
              <button onClick={handleNext} className="button-primary">
                Next ➡️
              </button>
            ) : (
              <button onClick={handleSubmit} className="button-primary" style={{ marginRight: "20px" }}>
                🏆 Submit Exam
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <h3 style={{ fontSize: "24px" }}>Your Results</h3>
          <p style={{ fontSize: "24px" }}>
            Score: {score.score} / {score.total_questions}
          </p>

          <button onClick={() => setView("menu")} className="button-primary">
            🏠 Back to Dashboard
          </button>
          <h3>Review Questions</h3>
          <div style={{ marginTop: "20px", textAlign: "left" }}>
            {questions.map((q, idx) => {
              const result = score.results[q.id] || score.results[q.id.toString()];

              if (!result) {
                return (
                  <div key={q.id} style={{ padding: 15, border: "1px solid #ccc", marginTop: 20 }}>
                    <p><b>Q{idx + 1}. {q.question}</b></p>
                    <p style={{ color: "red" }}>⚠ No result available for this question</p>
                  </div>
                );
              }

              return (
                <div key={q.id} style={{ padding: 15, border: "1px solid #ccc", marginTop: 20 }}>
                  <p><b>Q{idx + 1}. {q.question}</b></p>

                  {q.options.map((opt, i) => {
                    const isUser = result.user_answer === opt;
                    const isCorrect = result.correct_answer === opt;

                    return (
                      <p key={i} style={{ fontSize: 18, color: isCorrect ? "green" : isUser ? "red" : "black" }}>
                        {String.fromCharCode(97 + i)}) {opt}
                        {isCorrect && " ✔ Correct"}
                        {isUser && !isCorrect && " ✘ Your Answer"}
                      </p>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: 40,
          padding: 10,
          textAlign: "center",
          borderTop: "1px solid #ccc",
          fontSize: 20,
          color: "#555",
        }}
      >
        Developed by Sanjoy Kumar Das
      </footer>
    </div>
  );
}

export default App;
