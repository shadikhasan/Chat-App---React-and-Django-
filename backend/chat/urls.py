from django.urls import path
from .views import UsersListView, ConversationView

urlpatterns = [
    path("users/", UsersListView.as_view()),
    path("history/<str:username>/", ConversationView.as_view()),
]
