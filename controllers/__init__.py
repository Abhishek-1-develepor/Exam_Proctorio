"""controllers/__init__.py — Register all blueprints."""

from . import auth_controller
from . import detect_controller
from . import admin_controller
from . import page_controller


def register_blueprints(app):
    """Register all Flask blueprints."""
    app.register_blueprint(auth_controller.bp)
    app.register_blueprint(detect_controller.bp)
    app.register_blueprint(admin_controller.bp)
    app.register_blueprint(page_controller.bp)