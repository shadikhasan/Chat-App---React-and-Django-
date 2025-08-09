from django.contrib.auth.models import User
from django.db.models import Q, Count, OuterRef, Subquery, DateTimeField
from django.db.models.functions import Coalesce
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Message
from .presence import get_presence
from .serializers import MessageSerializer, UserPublicSerializer


class UsersListView(APIView):
    """
    Returns threads with last message + unread count.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        me = request.user

        # last message id and created_at for each counterpart
        last_msg_id_sq = (
            Message.objects
            .filter(Q(sender=me, receiver=OuterRef('pk')) | Q(sender=OuterRef('pk'), receiver=me))
            .order_by('-created_at')
            .values('id')[:1]
        )
        last_msg_time_sq = (
            Message.objects
            .filter(Q(sender=me, receiver=OuterRef('pk')) | Q(sender=OuterRef('pk'), receiver=me))
            .order_by('-created_at')
            .values('created_at')[:1]
        )

        users_qs = (
            User.objects
            .exclude(id=me.id)
            .annotate(
                last_message_id=Subquery(last_msg_id_sq),
                last_message_created_at=Subquery(last_msg_time_sq, output_field=DateTimeField()),
                unread_count=Count('sent', filter=Q(sent__receiver=me, sent__is_read=False)),
            )
            # Fallback to date_joined when no messages exist
            .annotate(last_activity=Coalesce('last_message_created_at', 'date_joined'))
            .order_by('-last_activity', 'username')
        )

        # preload last messages
        last_ids = [u.last_message_id for u in users_qs if u.last_message_id]
        last_map = {}
        if last_ids:
            for m in Message.objects.filter(id__in=last_ids).select_related('sender', 'receiver'):
                last_map[m.id] = m

        data = []
        for u in users_qs:
            item = {
                "user": UserPublicSerializer(u).data,
                "unread_count": int(u.unread_count or 0),
                "last_message": None,
            }
            if u.last_message_id and u.last_message_id in last_map:
                lm = last_map[u.last_message_id]
                payload = MessageSerializer(lm).data
                payload["from_me"] = (lm.sender_id == me.id)
                item["last_message"] = payload
            data.append(item)

        return Response(data)
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