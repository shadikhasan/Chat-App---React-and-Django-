from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Message

class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]

class MessageSerializer(serializers.ModelSerializer):
    sender = UserPublicSerializer(read_only=True)
    receiver = UserPublicSerializer(read_only=True)
    class Meta:
        model = Message
        fields = ["id", "sender", "receiver", "text", "created_at", "is_read"]
