# Backend Python Flask Server API
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import openai
import mysql.connector
import lotus
from lotus.models import E5Model, OpenAIModel
import pandas as pd
import logging

# Initialize Flask app
app = Flask(__name__)

# Enable CORS only for trusted domain (add your actual domain)
CORS(app, resources={r"/api/*": {"origins": "http://localhost.*"}})

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Fetch OpenAI API key from environment variable
openai_api_key = os.getenv('OPENAI_API_KEY')
if not openai_api_key:
    logger.critical("OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.")
    raise EnvironmentError("OpenAI API key not found.")
openai.api_key = openai_api_key

# Initialize OpenAI client for making API requests
client = openai.Client()

# Configure Lotus AI models for semantic filtering and aggregation
lm = OpenAIModel(max_tokens=512)
rm = E5Model()
lotus.settings.configure(lm=lm, rm=rm)

# Connect to the MySQL database with proper error handling
try:
    db = mysql.connector.connect(
        host="localhost",
        user="admin",
        password="guest",
        database="chatbot_db"
    )
    logger.info("Successfully connected to the MySQL database.")
except mysql.connector.Error as err:
    logger.critical(f"Error connecting to the MySQL database: {err}")
    raise

# Function to load job data from the database into a pandas DataFrame
def load_job_data():
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT job_id, job_name, status FROM Job")
        jobs = cursor.fetchall()
        df = pd.DataFrame(jobs, columns=["job_id", "job_name", "status"])
        logger.info("Job data successfully loaded from database.")
        return df
    except Exception as e:
        logger.error(f"Error loading job data: {e}")
        return pd.DataFrame()

# Function to detect greeting messages
def detect_greeting(user_input):
    greetings = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]
    return any(greeting in user_input.lower() for greeting in greetings)

# Function to handle greeting response
def handle_greeting(user_name=None):
    if user_name:
        return f"Hello {user_name}, how can I assist you today?"
    else:
        return "Hello! How can I assist you today?"

# Function to handle Lotus AI queries for summarization and aggregation
def handle_lotus_tag_query(query, df):
    try:
        filtered_df = df.sem_filter(f"{{status}} indicates relevance to {query}")
        if filtered_df.empty:
            logger.error(f"Filtered DataFrame is empty. No relevant data for query: {query}")
            return "No relevant data found for the query."

        aggregated_result = filtered_df.sem_agg(f"Given each {{job_name}} and its {{status}}, {query}")._output
        if len(aggregated_result) == 0:
            logger.error(f"Aggregated result is empty for query: {query}")
            return "No aggregated results found."

        return aggregated_result[0]  # Assuming we're interested in the first result
    
    except IndexError as e:
        logger.error(f"Error using Lotus AI: list index out of range for query: {query}")
        return "Error: No results found for this query."
    
    except Exception as e:
        logger.error(f"Error using Lotus AI: {str(e)}")
        return f"Error using Lotus AI: {str(e)}"

# Function to handle job inquiries using RAG (Retrieval-Augmented Generation)
def handle_job_inquiry_rag(user_input):
    df = load_job_data()

    # Step 1: Use GPT to understand and extract entities from the user's question (NLU)
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for job tracking."},
                {"role": "user", "content": f"The user said: '{user_input}'. Please extract any job-related information like job_id, job_name, or status from the user's question."}
            ],
            max_tokens=100
        )
        
        logger.info(f"OpenAPI Response: {response.choices[0].message.content}")
        bot_response = response.choices[0].message.content.strip()  # Correct way to access the response
        logger.info(f"OpenAI successfully processed the user input: {user_input}")
    except Exception as e:
        logger.error(f"Error processing OpenAI request: {e}")
        return f"Error processing OpenAI request: {e}"

    parsed_entities = extract_entities_from_gpt(bot_response)

    if parsed_entities.get('job_id'):
        retrieved_data = get_job_status_by_job_id(parsed_entities['job_id'])
    elif parsed_entities.get('job_name'):
        retrieved_data = get_job_status_by_job_name(parsed_entities['job_name'])
    else:
        retrieved_data = handle_lotus_tag_query(user_input, df)

    final_response = generate_final_response(user_input, retrieved_data)
    return final_response

# Simulate the entity extraction process from GPT's response
def extract_entities_from_gpt(gpt_text):
    entities = {}
    if 'job_id' in gpt_text:
        entities['job_id'] = gpt_text.split('job_id')[1].split()[0]
    if 'job_name' in gpt_text:
        entities['job_name'] = gpt_text.split('job_name')[1].split()[0]
    return entities

# Function to generate a final response using GPT (combining the retrieved data)
def generate_final_response(user_input, retrieved_data):
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for job tracking."},
                {"role": "user", "content": f"The user asked: {user_input}. Based on the database query, here is the relevant information: {retrieved_data}. Generate a polite and helpful response based on this information."}
            ],
            max_tokens=150
        )
        
        logger.info(f"OpenAPI Response: {response.choices[0].message.content}")
        return response.choices[0].message.content.strip()  # Correct way to access the response
    except Exception as e:
        logger.error(f"Error generating final response: {e}")
        return f"Error generating final response: {e}"

# Function to get job status by job_id
def get_job_status_by_job_id(job_id):
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT status FROM Job WHERE job_id = %s", (job_id,))
        result = cursor.fetchone()
        if result:
            return f"The status of the job with job_id {job_id} is: {result['status']}"
        else:
            return f"No job found with job_id {job_id}."
    except Exception as e:
        logger.error(f"Error retrieving job status by job_id: {e}")
        return f"Error retrieving job status by job_id: {e}"

# Function to get job status by job_name
def get_job_status_by_job_name(job_name):
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT status FROM Job WHERE job_name LIKE %s", ('%' + job_name + '%',))
        result = cursor.fetchone()
        if result:
            return f"The status of the job '{job_name}' is: {result['status']}"
        else:
            return f"No job found with the name '{job_name}'."
    except Exception as e:
        logger.error(f"Error retrieving job status by job_name: {e}")
        return f"Error retrieving job status by job_name: {e}"

# Define the chatbot API route
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()  # Ensure valid JSON is received
        user_input = data.get('userInput', '')
        user_name = data.get('userName', '')  # Get user's name if provided

        # Check if the user input is a greeting
        if detect_greeting(user_input):
            bot_response = handle_greeting(user_name)
        else:
            # Handle the RAG-based inquiry
            bot_response = handle_job_inquiry_rag(user_input)

        if user_name and not detect_greeting(user_input):
            bot_response = f"Hello {user_name}, {bot_response}"

        return jsonify({"botResponse": bot_response})
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({"error": "Internal server error", "message": str(e)}), 500

# Start the Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
