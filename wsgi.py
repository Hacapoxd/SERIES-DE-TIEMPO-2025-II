"""
WSGI configuration for Time Series Dashboard
This file contains the WSGI application used by WSGI servers like Gunicorn
"""

from app import app

# This is the WSGI application object
application = app

if __name__ == "__main__":
    application.run()