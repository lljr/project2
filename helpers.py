from flask import session, redirect, url_for, request

from functools import wraps


def login_required(f):
    """Decorate routes to require user login."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO maybe I could use request.args.get("user") instead of working
        # with session...
        # OR I could do both
        # like if session.get("username") is None or request.args.get("username") is None
        if session.get("username") is None:
            return redirect(url_for('adduser'))
        return f(*args, **kwargs)

    return decorated_function


def name_required(f):
    """Decorate route to require a display name."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.args.get("name") is None:
            return redirect('adduser')

        return f(*args, **kwargs)

    return decorated_function
