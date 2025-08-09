from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from .serializers import RegisterSerializer

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        s = RegisterSerializer(data=request.data)
        if s.is_valid():
            user = User(
                username=s.validated_data["username"],
                email=s.validated_data.get("email", ""),
                first_name=s.validated_data.get("first_name", ""),
                last_name=s.validated_data.get("last_name", ""),
            )
            user.set_password(s.validated_data["password"])
            user.save()
            return Response({"detail": "registered"}, status=status.HTTP_201_CREATED)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = TokenObtainPairSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        data = serializer.validated_data  # {"access":..., "refresh":...}
        user = serializer.user
        data.update({
            "user": {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
            }
        })
        return Response(data)

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        u = request.user
        return Response({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
        })

class RefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        s = TokenRefreshSerializer(data=request.data)  # expects {"refresh": "..."}
        if s.is_valid():
            return Response(s.validated_data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
