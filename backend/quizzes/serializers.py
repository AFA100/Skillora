from rest_framework import serializers
from django.utils import timezone
from .models import Quiz, Question, Answer, QuizAttempt, QuestionResponse, QuizAnalytics
from courses.models import Course, Lesson
from enrollments.models import Enrollment


class AnswerSerializer(serializers.ModelSerializer):
    """Serializer for quiz answer choices"""
    
    class Meta:
        model = Answer
        fields = [
            'id', 'answer_text', 'is_correct', 'match_order', 'order'
        ]
        read_only_fields = ['id']
    
    def to_representation(self, instance):
        """Hide correct answers for students during quiz taking"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Hide correct answers during quiz taking (not review)
        if request and hasattr(request, 'hide_correct_answers') and request.hide_correct_answers:
            data.pop('is_correct', None)
            data.pop('match_order', None)
        
        return data


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for quiz questions"""
    
    answers = AnswerSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'question_type', 'question_text', 'explanation', 
            'image', 'points', 'order', 'is_required', 'answers'
        ]
        read_only_fields = ['id']
    
    def to_representation(self, instance):
        """Customize representation based on context"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Hide explanations during quiz taking
        if request and hasattr(request, 'hide_explanations') and request.hide_explanations:
            data.pop('explanation', None)
        
        return data


class QuestionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating questions with answers"""
    
    answers = AnswerSerializer(many=True, write_only=True)
    
    class Meta:
        model = Question
        fields = [
            'question_type', 'question_text', 'explanation', 
            'image', 'points', 'order', 'is_required', 'answers'
        ]
    
    def create(self, validated_data):
        answers_data = validated_data.pop('answers', [])
        question = Question.objects.create(**validated_data)
        
        # Create answers
        for answer_data in answers_data:
            Answer.objects.create(question=question, **answer_data)
        
        return question
    
    def update(self, instance, validated_data):
        answers_data = validated_data.pop('answers', None)
        
        # Update question fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update answers if provided
        if answers_data is not None:
            # Delete existing answers
            instance.answers.all().delete()
            
            # Create new answers
            for answer_data in answers_data:
                Answer.objects.create(question=instance, **answer_data)
        
        return instance


class QuizSerializer(serializers.ModelSerializer):
    """Serializer for quiz listing and details"""
    
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()
    course_title = serializers.CharField(source='course.title', read_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'instructions', 'quiz_type',
            'time_limit_minutes', 'max_attempts', 'passing_score', 'total_points',
            'available_from', 'available_until', 'is_active', 'is_available',
            'shuffle_questions', 'shuffle_answers', 'show_correct_answers',
            'show_score_immediately', 'allow_review', 'require_completion',
            'course', 'course_title', 'lesson', 'lesson_title',
            'question_count', 'questions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_points', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate quiz data"""
        # Check availability dates
        if data.get('available_from') and data.get('available_until'):
            if data['available_from'] >= data['available_until']:
                raise serializers.ValidationError(
                    "Available from date must be before available until date"
                )
        
        # Validate lesson belongs to course
        if data.get('lesson') and data.get('course'):
            if data['lesson'].section.course != data['course']:
                raise serializers.ValidationError(
                    "Lesson must belong to the selected course"
                )
        
        return data


class QuizCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating quizzes"""
    
    questions = QuestionCreateSerializer(many=True, write_only=True, required=False)
    
    class Meta:
        model = Quiz
        fields = [
            'title', 'description', 'instructions', 'quiz_type',
            'time_limit_minutes', 'max_attempts', 'passing_score',
            'available_from', 'available_until', 'is_active',
            'shuffle_questions', 'shuffle_answers', 'show_correct_answers',
            'show_score_immediately', 'allow_review', 'require_completion',
            'course', 'lesson', 'questions'
        ]
    
    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        validated_data['created_by'] = self.context['request'].user
        
        quiz = Quiz.objects.create(**validated_data)
        
        # Create questions
        for question_data in questions_data:
            answers_data = question_data.pop('answers', [])
            question = Question.objects.create(quiz=quiz, **question_data)
            
            # Create answers
            for answer_data in answers_data:
                Answer.objects.create(question=question, **answer_data)
        
        return quiz


class QuestionResponseSerializer(serializers.ModelSerializer):
    """Serializer for student question responses"""
    
    selected_answer_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = QuestionResponse
        fields = [
            'id', 'question', 'selected_answers', 'text_response', 
            'response_data', 'is_correct', 'points_earned', 
            'time_spent_seconds', 'answered_at', 'selected_answer_ids'
        ]
        read_only_fields = [
            'id', 'is_correct', 'points_earned', 'answered_at'
        ]
    
    def create(self, validated_data):
        selected_answer_ids = validated_data.pop('selected_answer_ids', [])
        response = QuestionResponse.objects.create(**validated_data)
        
        # Set selected answers
        if selected_answer_ids:
            answers = Answer.objects.filter(id__in=selected_answer_ids)
            response.selected_answers.set(answers)
        
        # Evaluate the response
        response.evaluate_response()
        
        return response
    
    def update(self, instance, validated_data):
        selected_answer_ids = validated_data.pop('selected_answer_ids', None)
        
        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update selected answers
        if selected_answer_ids is not None:
            answers = Answer.objects.filter(id__in=selected_answer_ids)
            instance.selected_answers.set(answers)
        
        # Re-evaluate the response
        instance.evaluate_response()
        
        return instance


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for quiz attempts"""
    
    responses = QuestionResponseSerializer(many=True, read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    time_remaining_seconds = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'student', 'student_name', 
            'enrollment', 'attempt_number', 'status', 'score_points', 
            'score_percentage', 'passed', 'time_limit_minutes', 
            'time_spent_seconds', 'started_at', 'completed_at', 
            'expires_at', 'time_remaining_seconds', 'is_expired',
            'quiz_settings', 'responses', 'created_at'
        ]
        read_only_fields = [
            'id', 'attempt_number', 'score_points', 'score_percentage', 
            'passed', 'time_spent_seconds', 'started_at', 'completed_at', 
            'expires_at', 'quiz_settings', 'created_at'
        ]
    
    def create(self, validated_data):
        # Get the next attempt number
        existing_attempts = QuizAttempt.objects.filter(
            quiz=validated_data['quiz'],
            student=validated_data['student']
        ).count()
        
        validated_data['attempt_number'] = existing_attempts + 1
        return QuizAttempt.objects.create(**validated_data)


class QuizAttemptDetailSerializer(QuizAttemptSerializer):
    """Detailed serializer for quiz attempts with questions and responses"""
    
    quiz = QuizSerializer(read_only=True)
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Add quiz questions with student responses
        questions_data = []
        for question in instance.quiz.questions.all():
            question_data = QuestionSerializer(question, context=self.context).data
            
            # Add student response if exists
            try:
                response = instance.responses.get(question=question)
                question_data['student_response'] = QuestionResponseSerializer(response).data
            except QuestionResponse.DoesNotExist:
                question_data['student_response'] = None
            
            questions_data.append(question_data)
        
        data['quiz']['questions'] = questions_data
        return data


class QuizAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for quiz analytics"""
    
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    
    class Meta:
        model = QuizAnalytics
        fields = [
            'quiz', 'quiz_title', 'total_attempts', 'completed_attempts',
            'average_score', 'pass_rate', 'average_completion_time',
            'question_stats', 'last_calculated'
        ]
        read_only_fields = ['last_calculated']


class QuizSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for quiz listings"""
    
    course_title = serializers.CharField(source='course.title', read_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    question_count = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'quiz_type', 'time_limit_minutes',
            'max_attempts', 'passing_score', 'total_points', 'is_available',
            'course', 'course_title', 'lesson', 'lesson_title',
            'question_count', 'created_at'
        ]


class StudentQuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for student's quiz attempt history"""
    
    quiz = QuizSummarySerializer(read_only=True)
    
    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'attempt_number', 'status', 'score_points',
            'score_percentage', 'passed', 'time_spent_seconds',
            'started_at', 'completed_at', 'created_at'
        ]