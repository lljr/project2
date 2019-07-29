import functools
from flask import session
from flask_socketio import disconnect


def authenticated_only(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        if not session.username:
            disconnect()
        else:
            return f(*args, **kwargs)
    return wrapped
