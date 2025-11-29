# app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from config import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB
import time

app = Flask(__name__)
# Enable CORS for all origins, allowing your React frontend to connect
CORS(app)

# --- Database Connection Function ---


def create_db_connection():
    """Establishes and returns a database connection."""
    connection = None
    try:
        connection = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            passwd=MYSQL_PASSWORD,
            database=MYSQL_DB
        )
        if connection.is_connected():
            print("Successfully connected to MySQL database")
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# --- API Endpoint to Fetch Questions ---


@app.route('/api/<test_id>/questions', methods=['GET'])
def get_questions(test_id):

    table_map = {
        "test1": "nacc_exam_1_questions",
        "test2": "nacc_exam_2_questions",
        "test3": "nacc_exam_3_questions",
        "test4": "nacc_exam_4_questions",
        "test5": "nacc_exam_5_questions",
        "test6": "nacc_exam_6_questions",
        "test7": "nacc_exam_7_questions",
        "test8": "nacc_exam_8_questions",
        "test9": "nacc_exam_9_questions",
        "test10": "nacc_exam_10_questions",
        "test11": "questions_1_to_200_out_of_800",
        "test12": "questions_201_to_400_out_of_800",
        "test13": "questions_401_to_600_out_of_800",
        "test14": "questions_601_to_800_out_of_800"
    }

    if test_id not in table_map:
        return jsonify({"error": "Invalid test id"}), 400

    """
    Fetches all questions from the nacc_exam_1_questions table.
    Returns a JSON array of question objects.
    """
    connection = create_db_connection()
    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500

    questions_list = []
    try:
        # Use dictionary=True to get results as dictionaries
        cursor = connection.cursor(dictionary=True)
        sql = f"SELECT id, Question, Option_A, Option_B, Option_C, Option_D FROM {table_map[test_id]}"
        cursor.execute(sql)
        questions = cursor.fetchall()

        for q in questions:
            # Prepare options as a list for easier handling in frontend
            options = [q['Option_A'], q['Option_B'],
                       q['Option_C'], q['Option_D']]
            questions_list.append({
                "id": q['id'],
                "question": q['Question'],
                "options": options
            })
    except Error as e:
        return jsonify({"error": "Failed to retrieve questions"}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

    return jsonify(questions_list)

# --- API Endpoint to Submit Exam and Calculate Score ---


@app.route('/api/<test_id>/submit_exam', methods=['POST'])
def submit_exam(test_id):
    table_map = {
        "test1": "nacc_exam_1_questions",
        "test2": "nacc_exam_2_questions",
        "test3": "nacc_exam_3_questions",
        "test4": "nacc_exam_4_questions",
        "test5": "nacc_exam_5_questions",
        "test6": "nacc_exam_6_questions",
        "test7": "nacc_exam_7_questions",
        "test8": "nacc_exam_8_questions",
        "test9": "nacc_exam_9_questions",
        "test10": "nacc_exam_10_questions",
        "test11": "questions_1_to_200_out_of_800",
        "test12": "questions_201_to_400_out_of_800",
        "test13": "questions_401_to_600_out_of_800",
        "test14": "questions_601_to_800_out_of_800"
    }

    if test_id not in table_map:
        return jsonify({"error": "Invalid test id"}), 400

    submitted_answers = request.json.get('answers')
    if not submitted_answers:
        return jsonify({"error": "No answers submitted"}), 400

    connection = create_db_connection()
    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500

    score = 0
    results = {}

    try:
        cursor = connection.cursor(dictionary=True)

        # Fetch correct answers
        question_ids = tuple(submitted_answers.keys())
        if not question_ids:
            return jsonify({"score": 0, "message": "No questions answered."}), 200

        placeholders = ', '.join(['%s'] * len(question_ids))
        query = f"SELECT id, Answer FROM {table_map[test_id]} WHERE id IN ({placeholders})"
        cursor.execute(query, question_ids)
        correct_answers_db = {str(q['id']): q['Answer']
                              for q in cursor.fetchall()}

        for q_id, user_answer in submitted_answers.items():
            correct_answer = correct_answers_db.get(q_id)

            if correct_answer:
                if str(user_answer).strip().lower() == str(correct_answer).strip().lower():
                    score += 1
                    results[q_id] = {
                        "user_answer": user_answer,
                        "correct": True,
                        "correct_answer": correct_answer
                    }
                else:
                    results[q_id] = {
                        "user_answer": user_answer,
                        "correct": False,
                        "correct_answer": correct_answer
                    }
            else:
                results[q_id] = {
                    "user_answer": user_answer,
                    "correct": False,
                    "correct_answer": "Question ID not found"
                }

        # ---------------------------
        # SAVE ATTEMPT TO DATABASE
        # ---------------------------
        cursor.execute(
            """
            INSERT INTO exam_attempts (user_id, test_id, score, total_questions)
            VALUES (%s, %s, %s, %s)
            """,
            (1, test_id, score, len(submitted_answers))
        )

        attempt_id = cursor.lastrowid

        # Save detailed answers
        for qid, result in results.items():
            cursor.execute(
                """
                INSERT INTO exam_attempt_answers
                (attempt_id, question_id, user_answer, correct_answer, is_correct)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    attempt_id,
                    qid,
                    result["user_answer"],
                    result["correct_answer"],
                    result["correct"]
                )
            )

        connection.commit()

    except Error as e:
        print("DB error:", e)
        return jsonify({"error": "Failed to process exam submission"}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

    return jsonify({
        "score": score,
        "total_questions": len(submitted_answers),
        "results": results
    })


@app.route('/api/attempt/<int:attempt_id>/details', methods=['GET'])
def get_attempt_details(attempt_id):
    connection = create_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT question_id, user_answer, correct_answer, is_correct
        FROM exam_attempt_answers
        WHERE attempt_id = %s
    """, (attempt_id,))
    rows = cursor.fetchall()

    cursor.close()
    connection.close()
    return jsonify(rows)


@app.route('/api/user/<int:user_id>/attempts', methods=['GET'])
def get_attempts(user_id):
    connection = create_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, test_id, attempt_time, score, total_questions
        FROM exam_attempts
        WHERE user_id = %s
        ORDER BY attempt_time DESC
    """, (user_id,))

    attempts = cursor.fetchall()
    cursor.close()
    connection.close()
    return jsonify(attempts)


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    connection = create_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute(
        "SELECT id, password FROM users WHERE username=%s", (username,))
    user = cursor.fetchone()

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 400

    if user["password"] != password:
        return jsonify({"success": False, "message": "Invalid password"}), 400

    return jsonify({"success": True, "user_id": user["id"]})


@app.route('/api/user/<int:user_id>/summary', methods=['GET'])
def get_summary(user_id):
    connection = create_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT COUNT(*) AS attempts,
               MAX(score) AS best,
               AVG(score) AS average_score
        FROM exam_attempts
        WHERE user_id = %s
    """, (user_id,))

    summary = cursor.fetchone()

    cursor.close()
    connection.close()

    return jsonify(summary)


@app.route('/api/user/<int:user_id>/chart', methods=['GET'])
def get_chart_data(user_id):
    connection = create_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT attempt_time, score
        FROM exam_attempts
        WHERE user_id = %s
        ORDER BY attempt_time
    """, (user_id,))

    data = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(data)


@app.route('/api/attempt/<int:attempt_id>/info', methods=['GET'])
def get_attempt_info(attempt_id):
    connection = create_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute(
        "SELECT test_id FROM exam_attempts WHERE id=%s", (attempt_id,))
    row = cursor.fetchone()

    cursor.close()
    connection.close()

    return jsonify(row)


@app.route('/api/question/<int:question_id>/update_answer', methods=['PUT'])
def update_question_answer(question_id):
    data = request.json
    test_id = data.get('test_id')
    new_answer = data.get('new_answer')

    if not test_id:
        return jsonify({"success": False, "message": "Missing test_id"}), 400

    if not new_answer:
        return jsonify({"success": False, "message": "Missing new_answer"}), 400

    table_map = {
        "test1": "nacc_exam_1_questions",
        "test2": "nacc_exam_2_questions",
        "test3": "nacc_exam_3_questions",
        "test4": "nacc_exam_4_questions",
        "test5": "nacc_exam_5_questions",
        "test6": "nacc_exam_6_questions",
        "test7": "nacc_exam_7_questions",
        "test8": "nacc_exam_8_questions",
        "test9": "nacc_exam_9_questions",
        "test10": "nacc_exam_10_questions",
        "test11": "questions_1_to_200_out_of_800",
        "test12": "questions_201_to_400_out_of_800",
        "test13": "questions_401_to_600_out_of_800",
        "test14": "questions_601_to_800_out_of_800"
    }

    if test_id not in table_map:
        return jsonify({"success": False, "message": "Invalid test_id"}), 400

    table = table_map[test_id]

    try:
        connection = create_db_connection()

        with connection.cursor(dictionary=True) as cursor:
            # Check if question exists in this test table
            cursor.execute(
                f"SELECT id FROM {table} WHERE id = %s", (question_id,))
            if cursor.fetchone() is None:
                return jsonify({
                    "success": False,
                    "message": "Question not found in this test"
                }), 404

            # Update answer
            cursor.execute(
                f"UPDATE {table} SET Answer = %s WHERE id = %s",
                (new_answer, question_id)
            )
            connection.commit()

        return jsonify({
            "success": True,
            "message": "Answer updated successfully"
        }), 200

    except Exception as err:
        print(f"Database error: {err}")
        return jsonify({
            "success": False,
            "message": f"Database error: {err}"
        }), 500


# --- Main Run Block ---
if __name__ == '__main__':
    # You can change the port if 5000 is already in use
    app.run(debug=True, port=5000)
