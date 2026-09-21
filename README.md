---
title: ProctorVision
emoji: 👁️
colorFrom: purple
colorTo: yellow
sdk: docker
pinned: false
license: mit
---

# ProctorVision

AI-powered exam proctoring with face verification, YOLO object detection, and MediaPipe head tracking.

## Features
- Face verification login (dlib + face_recognition)
- Real-time YOLO object detection (book, phone, laptop, person, tv, headphone)
- Head movement tracking (yaw/pitch/roll)
- Real-time sound alerts on violations
- Admin dashboard with live monitoring

## Tech Stack
- Flask 3.0 + Gunicorn
- YOLOv11n (ONNX Runtime)
- MediaPipe FaceMesh + Face Detector
- SQLite database
- Web Audio API for alerts