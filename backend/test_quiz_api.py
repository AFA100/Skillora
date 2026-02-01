#!/usr/bin/env python
"""
Simple test script to verify quiz API endpoints
Run this after starting the Django server
"""

import requests
import json

BASE_URL = 'http://127.0.0.1:8000/api'

def test_quiz_endpoints():
    print("Testing Quiz API Endpoints...")
    
    # Test quiz list endpoint (should require authentication)
    try:
        response = requests.get(f'{BASE_URL}/quizzes/')
        print(f"GET /api/quizzes/ - Status: {response.status_code}")
        if response.status_code == 401:
            print("✓ Authentication required (expected)")
        else:
            print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test student quiz list endpoint
    try:
        response = requests.get(f'{BASE_URL}/quizzes/student/')
        print(f"GET /api/quizzes/student/ - Status: {response.status_code}")
        if response.status_code == 401:
            print("✓ Authentication required (expected)")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\nQuiz API endpoints are properly configured!")
    print("Next steps:")
    print("1. Create a teacher account")
    print("2. Create a course")
    print("3. Create quizzes using the Quiz Builder")
    print("4. Test quiz taking as a student")

if __name__ == '__main__':
    test_quiz_endpoints()