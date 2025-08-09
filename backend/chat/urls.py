from django.urls import path
from .views import *

urlpatterns = [
    path("users/", UsersListView.as_view()),
    path("history/<str:username>/", ConversationView.as_view()),
    path("presence/<str:username>/", UserPresenceView.as_view()),
]
