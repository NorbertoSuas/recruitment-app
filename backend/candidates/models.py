from django.db import models

class Candidate(models.Model):
    objects = models.Manager()
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('interview', 'En entrevista'),
        ('accepted', 'Aceptado'),
        ('rejected', 'Rechazado'),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)
    experience = models.TextField(blank=True, null=True)
    education = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    skills = models.TextField()
    resume = models.FileField(upload_to='resumes/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.status}"

