from flask import session, redirect, url_for
from flask_socketio import disconnect

from functools import wraps


def login_required(f):
    """Decorate routes to require user login."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("username") is None:
            return redirect(url_for('adduser'))
        return f(*args, **kwargs)

    return decorated_function


def authenticated_only(f):
    """Disconnect a user that has logged in."""
    @wraps(f)
    def wrapped(*args, **kwargs):
        if session.get("username") is None:
            disconnect()
        else:
            return f(*args, **kwargs)
    return wrapped
