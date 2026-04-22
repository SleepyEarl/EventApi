const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // CRITICAL: Allows partner's frontend to access your API
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Ensure upload directory exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `event-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage: storage });

// In-Memory Database
let events = [];
let registrations = [];

// ==========================================
// PUBLIC/USER ENDPOINTS
// ==========================================

// 1. Get all events
app.get('/api/events', (req, res) => {
  res.status(200).json({ success: true, data: events });
});

// 2. Get single event details
app.get('/api/events/:id', (req, res) => {
  const event = events.find((e) => e.id === parseInt(req.params.id));
  if (!event)
    return res.status(404).json({ success: false, message: 'Event not found' });
  res.status(200).json({ success: true, data: event });
});

// 3. Register/Join an event
app.post('/api/events/:id/join', (req, res) => {
  const { userName } = req.body;
  const eventId = parseInt(req.params.id);

  if (!userName)
    return res
      .status(400)
      .json({ success: false, message: 'User name is required' });

  const registration = {
    id: Date.now(),
    eventId,
    userName,
    joinedAt: new Date(),
  };
  registrations.push(registration);

  res
    .status(201)
    .json({ success: true, message: `Welcome to the event, ${userName}!` });
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// 4. Create an event (Multipart Form Data)
app.post('/api/admin/events', upload.single('eventImage'), (req, res) => {
  const { title, date, description } = req.body;

  if (!title || !date) {
    return res
      .status(400)
      .json({ success: false, message: 'Title and Date are required' });
  }

  const newEvent = {
    id: Date.now(),
    title,
    date,
    description: description || '',
    imagePath: req.file ? `/uploads/${req.file.filename}` : null,
  };

  events.push(newEvent);
  res.status(201).json({ success: true, data: newEvent });
});

// 5. Delete an event
app.delete('/api/admin/events/:id', (req, res) => {
  const eventId = parseInt(req.params.id);
  const eventIndex = events.findIndex((e) => e.id === eventId);

  if (eventIndex === -1)
    return res.status(404).json({ success: false, message: 'Event not found' });

  // Clean up image file
  const event = events[eventIndex];
  if (event.imagePath) {
    const fullPath = path.join(__dirname, event.imagePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  events.splice(eventIndex, 1);
  registrations = registrations.filter((r) => r.eventId !== eventId);

  res
    .status(200)
    .json({ success: true, message: 'Event deleted successfully' });
});

// 6. View all registrations (Admin Dashboard)
app.get('/api/admin/registrations', (req, res) => {
  const report = events.map((event) => ({
    eventTitle: event.title,
    eventId: event.id,
    attendees: registrations.filter((r) => r.eventId === event.id),
  }));
  res.status(200).json({ success: true, data: report });
});

app.listen(PORT, () => {
  console.log(`Backend Active: http://localhost:${PORT}`);
});
