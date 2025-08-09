from django.conf import settings
from django.db import models

class Message(models.Model):
    STATUS_SENT = "sent"
    STATUS_DELIVERED = "delivered"
    STATUS_SEEN = "seen"
    STATUS_CHOICES = [
        (STATUS_SENT, "Sent"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_SEEN, "Seen"),
    ]

    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent")
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    # receipts
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_SENT)
    delivered_at = models.DateTimeField(null=True, blank=True)
    seen_at = models.DateTimeField(null=True, blank=True)

    is_read = models.BooleanField(default=False)  # kept for compatibility; mirrors STATUS_SEEN

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender} → {self.receiver}: {self.text[:30]}"
