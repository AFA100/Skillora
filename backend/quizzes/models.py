from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import json


class Quiz(models.Model):
    """Enhanced Quiz model with comprehensive features"""
    
    QUIZ_TYPES = [
        ('practice', 'Practice Quiz'),
        ('graded', 'Graded Assessment'),
        ('final', 'Final Exam'),
        ('survey', 'Survey'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='quizzes'
    )
    lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='quizzes',
        null=True,
        blank=True,
        help_text="Optional: Associate quiz with specific lesson"
    )
    
    # Quiz Details
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True, help_text="Instructions for students")
    quiz_type = models.CharField(max_length=20, choices=QUIZ_TYPES, default='practice')
    
    # Timing and Attempts
    time_limit_minutes = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Time limit in minutes (null = no limit)"
    )
    max_attempts = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Maximum number of attempts allowed"
    )
    
    # Scoring
    passing_score = models.PositiveIntegerField(
        default=70,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Minimum score to pass (percentage)"
    )
    total_points = models.PositiveIntegerField(default=0)
    
    # Availability
    available_from = models.DateTimeField(null=True, blank=True)
    available_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Settings
    shuffle_questions = models.BooleanField(default=False)
    shuffle_answers = models.BooleanField(default=False)
    show_correct_answers = models.BooleanField(default=True)
    show_score_immediately = models.BooleanField(default=True)
    allow_review = models.BooleanField(default=True)
    require_completion = models.BooleanField(default=False)
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_quizzes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'quizzes'
        verbose_name_plural = 'Quizzes'
        ordering = ['course', 'created_at']
        indexes = [
            models.Index(fields=['course', 'is_active']),
            models.Index(fields=['lesson']),
        ]
    
    def __str__(self):
        return f"{self.course.title} - {self.title}"
    
    @property
    def is_available(self):
        """Check if quiz is currently available"""
        now = timezone.now()
        if self.available_from and now < self.available_from:
            return False
        if self.available_until and now > self.available_until:
            return False
        return self.is_active
    
    @property
    def question_count(self):
        """Get total number of questions"""
        return self.questions.count()
    
    def calculate_total_points(self):
        """Calculate and update total points from all questions"""
        total = sum(q.points for q in self.questions.all())
        self.total_points = total
        self.save(update_fields=['total_points'])
        return total


class Question(models.Model):
    """Quiz question model supporting multiple question types"""
    
    QUESTION_TYPES = [
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
        ('essay', 'Essay'),
        ('fill_blank', 'Fill in the Blank'),
        ('matching', 'Matching'),
        ('ordering', 'Ordering'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    
    # Question Content
    question_text = models.TextField()
    explanation = models.TextField(blank=True, help_text="Explanation shown after answering")
    image = models.ImageField(upload_to='quiz_images/', blank=True, null=True)
    
    # Scoring
    points = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    
    # Ordering
    order = models.PositiveIntegerField(default=0)
    
    # Settings
    is_required = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'quiz_questions'
        ordering = ['quiz', 'order']
        unique_together = ['quiz', 'order']
        indexes = [
            models.Index(fields=['quiz', 'order']),
        ]
    
    def __str__(self):
        return f"{self.quiz.title} - Q{self.order}: {self.question_text[:50]}"
    
    def save(self, *args, **kwargs):
        # Auto-assign order if not provided
        if self.order == 0:
            last_question = Question.objects.filter(quiz=self.quiz).order_by('-order').first()
            self.order = (last_question.order + 1) if last_question else 1
        
        super().save(*args, **kwargs)
        
        # Update quiz total points
        self.quiz.calculate_total_points()


class Answer(models.Model):
    """Answer choices for questions"""
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    
    # Answer Content
    answer_text = models.TextField()
    is_correct = models.BooleanField(default=False)
    
    # For matching and ordering questions
    match_order = models.PositiveIntegerField(null=True, blank=True)
    
    # Ordering
    order = models.PositiveIntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'quiz_answers'
        ordering = ['question', 'order']
        indexes = [
            models.Index(fields=['question', 'is_correct']),
        ]
    
    def __str__(self):
        return f"{self.question.question_text[:30]} - {self.answer_text[:30]}"
    
    def save(self, *args, **kwargs):
        # Auto-assign order if not provided
        if self.order == 0:
            last_answer = Answer.objects.filter(question=self.question).order_by('-order').first()
            self.order = (last_answer.order + 1) if last_answer else 1
        
        super().save(*args, **kwargs)


class QuizAttempt(models.Model):
    """Enhanced quiz attempt tracking"""
    
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
        ('time_expired', 'Time Expired'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_attempts',
        limit_choices_to={'role': 'learner'}
    )
    enrollment = models.ForeignKey(
        'enrollments.Enrollment',
        on_delete=models.CASCADE,
        related_name='quiz_attempts',
        null=True,
        blank=True
    )
    
    # Attempt Details
    attempt_number = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    
    # Scoring
    score_points = models.PositiveIntegerField(default=0)
    score_percentage = models.FloatField(default=0.0)
    passed = models.BooleanField(default=False)
    
    # Timing
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Settings (copied from quiz at attempt time)
    quiz_settings = models.JSONField(default=dict, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'quiz_attempts'
        ordering = ['-created_at']
        unique_together = ['quiz', 'student', 'attempt_number']
        indexes = [
            models.Index(fields=['quiz', 'student']),
            models.Index(fields=['student', 'status']),
        ]
    
    def __str__(self):
        return f"{self.student.name} - {self.quiz.title} (Attempt {self.attempt_number})"
    
    def start_attempt(self):
        """Start the quiz attempt"""
        if self.status != 'not_started':
            raise ValueError("Attempt already started")
        
        self.status = 'in_progress'
        self.started_at = timezone.now()
        
        # Set expiration time if quiz has time limit
        if self.quiz.time_limit_minutes:
            self.time_limit_minutes = self.quiz.time_limit_minutes
            self.expires_at = self.started_at + timezone.timedelta(minutes=self.quiz.time_limit_minutes)
        
        # Copy quiz settings
        self.quiz_settings = {
            'shuffle_questions': self.quiz.shuffle_questions,
            'shuffle_answers': self.quiz.shuffle_answers,
            'show_correct_answers': self.quiz.show_correct_answers,
            'show_score_immediately': self.quiz.show_score_immediately,
            'allow_review': self.quiz.allow_review,
        }
        
        self.save()
    
    def complete_attempt(self):
        """Complete the quiz attempt and calculate score"""
        if self.status not in ['in_progress', 'time_expired']:
            raise ValueError("Cannot complete attempt in current status")
        
        self.status = 'completed'
        self.completed_at = timezone.now()
        
        if self.started_at:
            self.time_spent_seconds = int((self.completed_at - self.started_at).total_seconds())
        
        # Calculate score
        self.calculate_score()
        self.save()
    
    def calculate_score(self):
        """Calculate the attempt score"""
        total_points = 0
        earned_points = 0
        
        for response in self.responses.all():
            total_points += response.question.points
            if response.is_correct:
                earned_points += response.question.points
        
        self.score_points = earned_points
        
        if total_points > 0:
            self.score_percentage = (earned_points / total_points) * 100
        else:
            self.score_percentage = 0
        
        self.passed = self.score_percentage >= self.quiz.passing_score
    
    @property
    def is_expired(self):
        """Check if attempt has expired"""
        return self.expires_at and timezone.now() > self.expires_at
    
    @property
    def time_remaining_seconds(self):
        """Get remaining time in seconds"""
        if not self.expires_at:
            return None
        
        remaining = (self.expires_at - timezone.now()).total_seconds()
        return max(0, int(remaining))


class QuestionResponse(models.Model):
    """Student responses to quiz questions"""
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='responses')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='responses')
    
    # Response Data
    selected_answers = models.ManyToManyField(Answer, blank=True, related_name='responses')
    text_response = models.TextField(blank=True)
    response_data = models.JSONField(default=dict, blank=True)  # For complex question types
    
    # Scoring
    is_correct = models.BooleanField(default=False)
    points_earned = models.PositiveIntegerField(default=0)
    
    # Timing
    time_spent_seconds = models.PositiveIntegerField(default=0)
    answered_at = models.DateTimeField(auto_now=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'question_responses'
        unique_together = ['attempt', 'question']
        indexes = [
            models.Index(fields=['attempt', 'question']),
            models.Index(fields=['question', 'is_correct']),
        ]
    
    def __str__(self):
        return f"{self.attempt.student.name} - {self.question.question_text[:30]}"
    
    def evaluate_response(self):
        """Evaluate the response and set is_correct and points_earned"""
        question = self.question
        
        if question.question_type == 'multiple_choice':
            # Check if selected answers match correct answers
            correct_answers = set(question.answers.filter(is_correct=True))
            selected_answers = set(self.selected_answers.all())
            self.is_correct = correct_answers == selected_answers
            
        elif question.question_type == 'true_false':
            # Check single correct answer
            correct_answer = question.answers.filter(is_correct=True).first()
            selected_answer = self.selected_answers.first()
            self.is_correct = correct_answer == selected_answer
            
        elif question.question_type in ['short_answer', 'fill_blank']:
            # Simple text matching (case-insensitive)
            correct_answers = question.answers.filter(is_correct=True)
            user_answer = self.text_response.strip().lower()
            self.is_correct = any(
                answer.answer_text.strip().lower() == user_answer 
                for answer in correct_answers
            )
            
        elif question.question_type == 'essay':
            # Essays require manual grading
            self.is_correct = False  # Will be updated by instructor
            
        elif question.question_type == 'matching':
            # Check if all matches are correct
            response_data = self.response_data or {}
            correct_matches = {
                str(answer.id): answer.match_order 
                for answer in question.answers.all()
            }
            self.is_correct = response_data == correct_matches
            
        elif question.question_type == 'ordering':
            # Check if order is correct
            response_data = self.response_data or {}
            correct_order = list(question.answers.order_by('match_order').values_list('id', flat=True))
            user_order = [uuid.UUID(id_str) for id_str in response_data.get('order', [])]
            self.is_correct = correct_order == user_order
        
        # Set points earned
        self.points_earned = question.points if self.is_correct else 0
        self.save()


class QuizAnalytics(models.Model):
    """Analytics data for quizzes"""
    
    quiz = models.OneToOneField(Quiz, on_delete=models.CASCADE, related_name='analytics')
    
    # Attempt Statistics
    total_attempts = models.PositiveIntegerField(default=0)
    completed_attempts = models.PositiveIntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    pass_rate = models.FloatField(default=0.0)
    
    # Timing Statistics
    average_completion_time = models.PositiveIntegerField(default=0)  # in seconds
    
    # Question Statistics
    question_stats = models.JSONField(default=dict, blank=True)
    
    # Last Updated
    last_calculated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'quiz_analytics'
    
    def __str__(self):
        return f"Analytics for {self.quiz.title}"
    
    def calculate_analytics(self):
        """Calculate and update analytics"""
        attempts = self.quiz.attempts.all()
        completed_attempts = attempts.filter(status='completed')
        
        self.total_attempts = attempts.count()
        self.completed_attempts = completed_attempts.count()
        
        if self.completed_attempts > 0:
            # Calculate averages
            total_score = sum(attempt.score_percentage for attempt in completed_attempts)
            self.average_score = total_score / self.completed_attempts
            
            passed_attempts = completed_attempts.filter(passed=True).count()
            self.pass_rate = (passed_attempts / self.completed_attempts) * 100
            
            total_time = sum(attempt.time_spent_seconds for attempt in completed_attempts)
            self.average_completion_time = total_time // self.completed_attempts
            
            # Calculate question statistics
            self.calculate_question_stats()
        
        self.save()
    
    def calculate_question_stats(self):
        """Calculate per-question statistics"""
        question_stats = {}
        
        for question in self.quiz.questions.all():
            responses = QuestionResponse.objects.filter(
                question=question,
                attempt__status='completed'
            )
            
            total_responses = responses.count()
            if total_responses > 0:
                correct_responses = responses.filter(is_correct=True).count()
                accuracy = (correct_responses / total_responses) * 100
                
                question_stats[str(question.id)] = {
                    'total_responses': total_responses,
                    'correct_responses': correct_responses,
                    'accuracy_percentage': accuracy,
                    'average_time': responses.aggregate(
                        avg_time=models.Avg('time_spent_seconds')
                    )['avg_time'] or 0
                }
        
        self.question_stats = question_stats