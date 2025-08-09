from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Message
from .presence import get_presence
from .serializers import MessageSerializer, UserPublicSerializer

class UsersListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        users = User.objects.exclude(id=request.user.id).order_by("username")
        return Response(UserPublicSerializer(users, many=True).data)

class ConversationView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, username):
        try:
            other = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        qs = Message.objects.filter(
            Q(sender=request.user, receiver=other) | Q(sender=other, receiver=request.user)
        ).order_by("created_at")
        return Response(MessageSerializer(qs, many=True).data)


class UserPresenceView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, username):
        return Response(get_presence(username))