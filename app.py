from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure OpenAI
api_key = os.getenv('OPENAI_API_KEY')
if not api_key or api_key == 'your_openai_api_key_here':
    print("Warning: OpenAI API key not set. Please add your API key to the .env file")
openai.api_key = api_key

# Default response when API key is not set
DEFAULT_RESPONSES = {
    "machine": "I recommend the Brother CS6000i for beginners. It's computerized, easy to use, and comes with many automatic features. Perfect for learning and has lots of built-in stitches.",
    "technique": "Here are some basic sewing techniques:\n1. Threading your machine correctly\n2. Winding and inserting the bobbin\n3. Adjusting thread tension\n4. Choosing the right stitch length\n5. Using the correct needle for your fabric",
    "problem": "Common sewing problems and solutions:\n1. Thread breaking: Check threading and tension\n2. Skipped stitches: Use the correct needle size\n3. Fabric not feeding: Check presser foot is down\n4. Needle breaking: Don't pull fabric too hard\n5. Thread bunching: Recheck threading and tension",
    "fabric": "For beginners, I recommend:\n1. Cotton: Stable and easy to work with\n2. Cotton-polyester blends: Durable and less wrinkly\n3. Linen: Good for practice\n4. Avoid stretchy, slippery, or very thin fabrics until you gain more experience"
}

def get_default_response(message):
    message = message.lower()
    if any(word in message for word in ['machine', 'recommend', 'beginner']):
        return DEFAULT_RESPONSES["machine"]
    elif any(word in message for word in ['technique', 'basic', 'how to']):
        return DEFAULT_RESPONSES["technique"]
    elif any(word in message for word in ['problem', 'issue', 'help', 'wrong']):
        return DEFAULT_RESPONSES["problem"]
    elif any(word in message for word in ['fabric', 'material', 'cloth']):
        return DEFAULT_RESPONSES["fabric"]
    return "I'm here to help with sewing! You can ask me about:\n- Sewing machine recommendations\n- Basic techniques\n- Common problems\n- Fabric selection"

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')

        # If API key is not set, use default responses
        if not api_key or api_key == 'your_openai_api_key_here':
            response = get_default_response(user_message)
            return jsonify({
                "success": True,
                "response": response
            })

        # Create a system message to set the context
        system_message = """You are an AI Sewing Assistant, expert in:
        - Sewing machine recommendations
        - Basic and advanced sewing techniques
        - Troubleshooting sewing problems
        - Fabric selection and care
        - Pattern making and alterations
        
        Provide helpful, concise responses focused on sewing."""

        # Create the conversation with the system message
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]

        try:
            # Get response from OpenAI
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            # Extract the assistant's response
            assistant_response = response.choices[0].message['content']
            
        except openai.error.AuthenticationError:
            print("OpenAI API Authentication Error: Please check your API key")
            return jsonify({
                "success": False,
                "error": "API authentication failed. Please check your OpenAI API key."
            }), 401
        except openai.error.RateLimitError:
            print("OpenAI API Rate Limit Error: Too many requests")
            return jsonify({
                "success": False,
                "error": "Rate limit exceeded. Please try again later."
            }), 429
        except Exception as e:
            print(f"OpenAI API Error: {str(e)}")
            return jsonify({
                "success": False,
                "error": "Failed to get response from AI service."
            }), 500

        return jsonify({
            "success": True,
            "response": assistant_response
        })

    except Exception as e:
        print(f"Server Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": "An unexpected error occurred."
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
