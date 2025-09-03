import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTimes,
  faSearch,
  faEdit,
  faTrash,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

const ManageEvents = () => {
  const [events, setEvents] = useState([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  // Realtime fetch events
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snapshot) => {
      const fetchedEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(fetchedEvents);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch students count once
  useEffect(() => {
    const fetchStudents = async () => {
      const snapshot = await getDocs(collection(db, "students"));
      setStudentsCount(snapshot.size);
    };
    fetchStudents();
  }, []);

  // Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Determine event status
  const getStatus = (date, startTime, endTime) => {
    const now = new Date();
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    if (now < start) return "Upcoming";
    if (now >= start && now <= end) return "Ongoing";
    return "Completed";
  };

  // Add or update event
  const handleSubmit = async (e) => {
    e.preventDefault();
    const status = getStatus(formData.date, formData.startTime, formData.endTime);
    const eventData = { ...formData, students: studentsCount, status };

    if (editingEvent) {
      await updateDoc(doc(db, "events", editingEvent.id), eventData);
    } else {
      await addDoc(collection(db, "events"), eventData);
    }

    setFormData({ title: "", description: "", date: "", startTime: "", endTime: "" });
    setEditingEvent(null);
    setShowModal(false);
  };

  // Confirm & delete event
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      await deleteDoc(doc(db, "events", id));
    }
  };

  // Edit event
  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
    });
    setShowModal(true);
  };

  // Filter events
  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Card colors by status
  const getStatusColor = (status) => {
    switch (status) {
      case "Ongoing":
        return "bg-green-600";
      case "Completed":
        return "bg-purple-600";
      case "Upcoming":
        return "bg-orange-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <section className="bg-white rounded-lg shadow mb-6">
      {/* Top bar */}
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Manage Events</h2>
        <div className="flex space-x-3 items-center">
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-3 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-md pl-10 pr-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowModal(true);
            }}
            className="bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
          <button
            onClick={() => setSearchTerm("")}
            className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>

      {/* Events */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-center text-gray-500 col-span-full">Loading events...</p>
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
            >
              <div className={`${getStatusColor(event.status)} p-4 text-white`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">{event.title}</h3>
                  <span className="bg-black/20 px-2 py-1 rounded text-xs">
                    {event.status}
                  </span>
                </div>
                <p className="text-sm mt-1">
                  {event.date} | {event.startTime} - {event.endTime}
                </p>
              </div>
              <div className="p-4">
                <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    <FontAwesomeIcon icon={faUsers} className="mr-1" />{" "}
                    {event.students} Students
                  </span>
                  <div>
                    <button
                      onClick={() => handleEdit(event)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 col-span-full">No events found</p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">
              {editingEvent ? "Edit Event" : "Add Event"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Event Title"
                className="border rounded-md p-2 w-full"
                required
              />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description"
                className="border rounded-md p-2 w-full"
                required
              />
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="border rounded-md p-2 w-full"
                required
              />
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="border rounded-md p-2 w-full"
                required
              />
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="border rounded-md p-2 w-full"
                required
              />

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  {editingEvent ? "Update Event" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ManageEvents;
