"""
Shared rate limiter instance.
Imported by main.py (to register the exception handler) and by route modules
(to apply @limiter.limit decorators). Keeping it here breaks the circular import
that would result from instantiating it in main.py.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
