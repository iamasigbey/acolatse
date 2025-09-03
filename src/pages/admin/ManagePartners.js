import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import {
  FaCalendarAlt,
  FaMale,
  FaFemale,
  FaRandom,
  FaTrashAlt,
  FaUsersSlash,
  FaEdit,
  FaSave,
  FaTimes,
  FaPlus,
} from "react-icons/fa";
import Swal from "sweetalert2";

const ManagePartners = () => {
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedFemales, setSelectedFemales] = useState([]);
  const [createMale, setCreateMale] = useState("");
  const [createFemales, setCreateFemales] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // 🔹 Fetch events, students, partners
  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventsSnap = await getDocs(collection(db, "events"));
        setEvents(eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const studentsSnap = await getDocs(collection(db, "students"));
        setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const partnersSnap = await getDocs(collection(db, "partners"));
        setPartners(partnersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching data:", error);
        Swal.fire("Error!", "Failed to load data.", "error");
      }
    };
    fetchData();
  }, []);

  const males = students.filter((s) => s.gender?.toLowerCase() === "male");
  const females = students.filter((s) => s.gender?.toLowerCase() === "female");

  // 🔹 Generate fair partners
  const handleGenerate = async () => {
    if (!selectedEvent) {
      return Swal.fire("Error!", "Please select an event first.", "error");
    }
    if (males.length === 0) {
      return Swal.fire("Error!", "No male students found.", "error");
    }
    if (females.length === 0) {
      return Swal.fire("Error!", "No female students found.", "error");
    }
    if (females.length < males.length) {
      return Swal.fire(
        "Error!",
        "Not enough females to pair with all males.",
        "error"
      );
    }

    // Clear existing partners for this event
    const q = query(
      collection(db, "partners"),
      where("eventId", "==", selectedEvent)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, "partners", d.id));
    }

    // Step 1: Shuffle females
    let shuffledFemales = [...females].sort(() => Math.random() - 0.5);

    // Step 2: Give each male one female
    const newPartners = [];
    const usedFemales = new Set();

    males.forEach((male, i) => {
      const female = shuffledFemales[i];
      if (female) {
        usedFemales.add(female.id);
        newPartners.push({
          eventId: selectedEvent,
          male,
          females: [female],
          createdAt: new Date(),
        });
      }
    });

    // Step 3: Distribute remaining females
    let remainingFemales = shuffledFemales.filter(
      (f) => !usedFemales.has(f.id)
    );
    let maleIndex = 0;
    while (remainingFemales.length > 0) {
      const female = remainingFemales.pop();
      if (female) newPartners[maleIndex].females.push(female);
      maleIndex = (maleIndex + 1) % males.length;
    }

    // Save new partners in Firestore
    const savedPartners = [];
    for (const p of newPartners) {
      const docRef = await addDoc(collection(db, "partners"), p);
      savedPartners.push({ id: docRef.id, ...p });
    }

    setPartners((prev) => [
      ...prev.filter((p) => p.eventId !== selectedEvent),
      ...savedPartners,
    ]);

    Swal.fire("Success!", "Partners successfully generated!", "success");
  };

  // 🔹 Create new pairing
  const handleCreatePairing = async () => {
    if (!selectedEvent) {
      return Swal.fire("Error!", "Please select an event.", "error");
    }
    if (!createMale) {
      return Swal.fire("Error!", "Please select a male student.", "error");
    }
    if (createFemales.length === 0) {
      return Swal.fire("Error!", "Please select at least one female.", "error");
    }

    // Check if male is already paired in this event
    if (
      partners.some(
        (p) => p.eventId === selectedEvent && p.male.id === createMale
      )
    ) {
      return Swal.fire(
        "Error!",
        "This male is already paired for the selected event.",
        "error"
      );
    }

    // Check if selected females are already paired in this event
    const alreadyTaken = createFemales.filter((femaleId) =>
      partners.some(
        (p) =>
          p.eventId === selectedEvent &&
          p.females.some((f) => f.id === femaleId)
      )
    );
    if (alreadyTaken.length > 0) {
      return Swal.fire(
        "Error!",
        `The following females are already paired: ${females
          .filter((f) => alreadyTaken.includes(f.id))
          .map((f) => f.name)
          .join(", ")}.`,
        "error"
      );
    }

    // Create new pairing
    const male = males.find((m) => m.id === createMale);
    const selectedFemaleData = females.filter((f) =>
      createFemales.includes(f.id)
    );
    const newPairing = {
      eventId: selectedEvent,
      male,
      females: selectedFemaleData,
      createdAt: new Date(),
    };

    // Save to Firestore
    try {
      const docRef = await addDoc(collection(db, "partners"), newPairing);
      setPartners((prev) => [...prev, { id: docRef.id, ...newPairing }]);
      // Reset form
      setCreateMale("");
      setCreateFemales([]);
      setShowCreateForm(false);
      Swal.fire("Success!", "Pairing created successfully!", "success");
    } catch (error) {
      console.error("Error creating pairing:", error);
      Swal.fire("Error!", "Failed to create pairing.", "error");
    }
  };

  // 🔹 Clear ALL partners
  const handleClearAll = async () => {
    if (partners.length === 0) {
      return Swal.fire("Info", "No partners to clear.", "info");
    }
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will clear ALL partners. This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, clear all!",
      cancelButtonText: "No, cancel!",
    });
    if (result.isConfirmed) {
      try {
        const snap = await getDocs(collection(db, "partners"));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, "partners", d.id));
        }
        setPartners([]);
        Swal.fire("Success!", "All partners cleared!", "success");
      } catch (error) {
        console.error("Error clearing partners:", error);
        Swal.fire("Error!", "Failed to clear partners.", "error");
      }
    }
  };

  // 🔹 Start editing
  const handleEdit = (partner) => {
    setEditingId(partner.id);
    setSelectedFemales(partner.females.map((f) => f.id));
  };

  // 🔹 Save updated females
  const handleSave = async (partner) => {
    if (selectedFemales.length === 0) {
      return Swal.fire("Error!", "At least one female must be selected.", "error");
    }

    // Check if selected females are already paired in this event (excluding current partner)
    const alreadyTaken = selectedFemales.filter((femaleId) =>
      partners.some(
        (p) =>
          p.id !== partner.id &&
          p.eventId === partner.eventId &&
          p.females.some((f) => f.id === femaleId)
      )
    );
    if (alreadyTaken.length > 0) {
      return Swal.fire(
        "Error!",
        `The following females are already paired: ${females
          .filter((f) => alreadyTaken.includes(f.id))
          .map((f) => f.name)
          .join(", ")}.`,
        "error"
      );
    }

    const updatedFemales = females.filter((f) =>
      selectedFemales.includes(f.id)
    );

    // Update Firestore
    try {
      await updateDoc(doc(db, "partners", partner.id), {
        females: updatedFemales,
      });
      // Update state
      setPartners(
        partners.map((p) =>
          p.id === partner.id ? { ...p, females: updatedFemales } : p
        )
      );
      setEditingId(null);
      setSelectedFemales([]);
      Swal.fire("Success!", "Partner updated successfully!", "success");
    } catch (error) {
      console.error("Error updating partner:", error);
      Swal.fire("Error!", "Failed to update partner.", "error");
    }
  };

  // 🔹 Group partners by event
  const groupByEvent = () => {
    const groups = {};
    partners.forEach((p) => {
      if (!groups[p.eventId]) groups[p.eventId] = [];
      groups[p.eventId].push(p);
    });
    return groups;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Manage Partners</h1>
          <p className="text-gray-600 mt-2">
            Create and manage student partners for events
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-sm">Total Events</p>
            <h3 className="text-2xl font-bold">{events.length}</h3>
          </div>
          <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
            <FaCalendarAlt />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-sm">Male Students</p>
            <h3 className="text-2xl font-bold">{males.length}</h3>
          </div>
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <FaMale />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-sm">Female Students</p>
            <h3 className="text-2xl font-bold">{females.length}</h3>
          </div>
          <div className="p-3 rounded-full bg-pink-100 text-pink-600">
            <FaFemale />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Partner Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Select Event</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
            >
              <option value="">Select an event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
            >
              <FaRandom className="mr-2" /> Generate
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
            >
              <FaPlus className="mr-2" /> {showCreateForm ? "Cancel" : "Create Pairing"}
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleClearAll}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
            >
              <FaTrashAlt className="mr-2" /> Clear All
            </button>
          </div>
        </div>

        {/* Create Pairing Form */}
        {showCreateForm && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Create New Pairing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Male</label>
                <select
                  value={createMale}
                  onChange={(e) => setCreateMale(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                >
                  <option value="">Select a male</option>
                  {males
                    .filter(
                      (m) =>
                        !partners.some(
                          (p) => p.eventId === selectedEvent && p.male.id === m.id
                        )
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.idNumber})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Select Females (Hold Ctrl/Shift to select multiple)
                </label>
                <select
                  multiple
                  value={createFemales}
                  onChange={(e) =>
                    setCreateFemales(
                      Array.from(e.target.selectedOptions, (opt) => opt.value)
                    )
                  }
                  className="w-full border border-gray-300 rounded-md p-2 h-40"
                >
                  {females.map((f) => {
                    const alreadyTaken = partners.some(
                      (p) =>
                        p.eventId === selectedEvent &&
                        p.females.some((pf) => pf.id === f.id)
                    );
                    return (
                      <option key={f.id} value={f.id} disabled={alreadyTaken}>
                        {f.name} ({f.idNumber})
                      </option>
                    );
                  })}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Use Ctrl+click or Shift+click to select multiple females.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCreatePairing}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center"
              >
                <FaSave className="mr-2" /> Create
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Partners */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between">
          <h2 className="text-xl font-semibold">Current Partners</h2>
          <span className="text-sm text-gray-500">
            {partners.length} partner{partners.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="divide-y divide-gray-200">
          {partners.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <FaUsersSlash className="text-4xl mb-3 opacity-30 mx-auto" />
              <p>No partners generated yet</p>
            </div>
          ) : (
            Object.entries(groupByEvent()).map(([eventId, eventPartners]) => {
              const ev = events.find((e) => e.id === eventId);
              return (
                <div key={eventId}>
                  <div className="px-6 py-3 bg-gray-50 border-b">
                    <h3 className="text-lg font-medium">
                      {ev ? ev.title : "Unknown Event"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {eventPartners.length} partners
                    </p>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                        <th className="px-6 py-3">#</th>
                        <th className="px-6 py-3">Male</th>
                        <th className="px-6 py-3">Females</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventPartners.map((partner, i) => (
                        <tr key={partner.id || i} className="border-t">
                          <td className="px-6 py-4">{i + 1}</td>
                          <td className="px-6 py-4 flex flex-col">
                            <span className="flex items-center">
                              <FaMale className="text-blue-600 mr-2" />
                              {partner.male.name}
                            </span>
                            <span className="ml-6 text-xs text-gray-500">
                              ({partner.male.idNumber})
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {editingId === partner.id ? (
                              <select
                                multiple
                                value={selectedFemales}
                                onChange={(e) =>
                                  setSelectedFemales(
                                    Array.from(
                                      e.target.selectedOptions,
                                      (opt) => opt.value
                                    )
                                  )
                                }
                                className="w-full border rounded p-2 h-40"
                              >
                                {females.map((f) => {
                                  const alreadyTaken = partners.some(
                                    (p) =>
                                      p.id !== partner.id &&
                                      p.eventId === partner.eventId &&
                                      p.females.some((pf) => pf.id === f.id)
                                  );
                                  return (
                                    <option
                                      key={f.id}
                                      value={f.id}
                                      disabled={alreadyTaken}
                                    >
                                      {f.name} ({f.idNumber})
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              partner.females.map((f) => (
                                <span
                                  key={f.id}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800 mr-2 mb-2"
                                >
                                  <FaFemale className="text-pink-600 mr-1" />
                                  {f.name}
                                  <span className="ml-1 text-xs text-gray-500">
                                    ({f.idNumber})
                                  </span>
                                </span>
                              ))
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingId === partner.id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSave(partner)}
                                  className="bg-green-600 text-white px-3 py-1 rounded flex items-center"
                                >
                                  <FaSave className="mr-1" /> Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="bg-gray-400 text-white px-3 py-1 rounded flex items-center"
                                >
                                  <FaTimes className="mr-1" /> Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEdit(partner)}
                                className="bg-blue-600 text-white px-3 py-1 rounded flex items-center"
                              >
                                <FaEdit className="mr-1" /> Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagePartners;

// import React, { useEffect, useState } from "react";
// import { db } from "./firebase";
// import {
//   collection,
//   getDocs,
//   addDoc,
//   deleteDoc,
//   doc,
//   query,
//   where,
//   updateDoc,
// } from "firebase/firestore";
// import {
//   FaCalendarAlt,
//   FaMale,
//   FaFemale,
//   FaRandom,
//   FaTrashAlt,
//   FaUsersSlash,
//   FaEdit,
//   FaSave,
//   FaTimes,
//   FaPlus,
// } from "react-icons/fa";
// import Swal from "sweetalert2";

// const ManagePartners = () => {
//   const [events, setEvents] = useState([]);
//   const [students, setStudents] = useState([]);
//   const [partners, setPartners] = useState([]);
//   const [selectedEvent, setSelectedEvent] = useState("");
//   const [editingId, setEditingId] = useState(null);
//   const [selectedFemales, setSelectedFemales] = useState([]);
//   const [createMale, setCreateMale] = useState("");
//   const [createFemales, setCreateFemales] = useState([]);
//   const [showCreateForm, setShowCreateForm] = useState(false);

//   // 🔹 Fetch events, students, partners
//   useEffect(() => {
//     const fetchData = async () => {
//       const eventsSnap = await getDocs(collection(db, "events"));
//       setEvents(eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

//       const studentsSnap = await getDocs(collection(db, "students"));
//       setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

//       const partnersSnap = await getDocs(collection(db, "partners"));
//       setPartners(partnersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
//     };
//     fetchData();
//   }, []);

//   const males = students.filter((s) => s.gender?.toLowerCase() === "male");
//   const females = students.filter((s) => s.gender?.toLowerCase() === "female");

//   // 🔹 Generate fair partners
//   const handleGenerate = async () => {
//     if (!selectedEvent) {
//       return Swal.fire("Error!", "Please select an event first.", "error");
//     }
//     if (males.length === 0) {
//       return Swal.fire("Error!", "No male students found.", "error");
//     }
//     if (females.length === 0) {
//       return Swal.fire("Error!", "No female students found.", "error");
//     }
//     if (females.length < males.length) {
//       return Swal.fire(
//         "Error!",
//         "Not enough females to pair with all males.",
//         "error"
//       );
//     }

//     // Clear existing partners for this event
//     const q = query(
//       collection(db, "partners"),
//       where("eventId", "==", selectedEvent)
//     );
//     const snap = await getDocs(q);
//     for (const d of snap.docs) {
//       await deleteDoc(doc(db, "partners", d.id));
//     }

//     // Step 1: Shuffle females
//     let shuffledFemales = [...females].sort(() => Math.random() - 0.5);

//     // Step 2: Give each male one female
//     const newPartners = [];
//     const usedFemales = new Set();

//     males.forEach((male, i) => {
//       const female = shuffledFemales[i];
//       if (female) {
//         usedFemales.add(female.id);
//         newPartners.push({
//           eventId: selectedEvent,
//           male,
//           females: [female],
//           createdAt: new Date(),
//         });
//       }
//     });

//     // Step 3: Distribute remaining females
//     let remainingFemales = shuffledFemales.filter(
//       (f) => !usedFemales.has(f.id)
//     );
//     let maleIndex = 0;
//     while (remainingFemales.length > 0) {
//       const female = remainingFemales.pop();
//       if (female) newPartners[maleIndex].females.push(female);
//       maleIndex = (maleIndex + 1) % males.length;
//     }

//     // Save new partners in Firestore
//     const savedPartners = [];
//     for (const p of newPartners) {
//       const docRef = await addDoc(collection(db, "partners"), p);
//       savedPartners.push({ id: docRef.id, ...p });
//     }

//     setPartners((prev) => [
//       ...prev.filter((p) => p.eventId !== selectedEvent),
//       ...savedPartners,
//     ]);

//     Swal.fire("Success!", "Partners successfully generated!", "success");
//   };

//   // 🔹 Create new pairing
//   const handleCreatePairing = async () => {
//     if (!selectedEvent) {
//       return Swal.fire("Error!", "Please select an event.", "error");
//     }
//     if (!createMale) {
//       return Swal.fire("Error!", "Please select a male student.", "error");
//     }
//     if (createFemales.length === 0) {
//       return Swal.fire("Error!", "Please select at least one female.", "error");
//     }

//     // Check if male is already paired in this event
//     if (
//       partners.some(
//         (p) => p.eventId === selectedEvent && p.male.id === createMale
//       )
//     ) {
//       return Swal.fire(
//         "Error!",
//         "This male is already paired for the selected event.",
//         "error"
//       );
//     }

//     // Check if selected females are already paired in this event
//     const alreadyTaken = createFemales.filter((femaleId) =>
//       partners.some(
//         (p) =>
//           p.eventId === selectedEvent &&
//           p.females.some((f) => f.id === femaleId)
//       )
//     );
//     if (alreadyTaken.length > 0) {
//       return Swal.fire(
//         "Error!",
//         `The following females are already paired: ${females
//           .filter((f) => alreadyTaken.includes(f.id))
//           .map((f) => f.name)
//           .join(", ")}.`,
//         "error"
//       );
//     }

//     // Create new pairing
//     const male = males.find((m) => m.id === createMale);
//     const selectedFemaleData = females.filter((f) =>
//       createFemales.includes(f.id)
//     );
//     const newPairing = {
//       eventId: selectedEvent,
//       male,
//       females: selectedFemaleData,
//       createdAt: new Date(),
//     };

//     // Save to Firestore
//     const docRef = await addDoc(collection(db, "partners"), newPairing);
//     setPartners((prev) => [...prev, { id: docRef.id, ...newPairing }]);

//     // Reset form
//     setCreateMale("");
//     setCreateFemales([]);
//     setShowCreateForm(false);
//     Swal.fire("Success!", "Pairing created successfully!", "success");
//   };

//   // 🔹 Clear ALL partners
//   const handleClearAll = async () => {
//     if (partners.length === 0) {
//       return Swal.fire("Info", "No partners to clear.", "info");
//     }
//     const result = await Swal.fire({
//       title: "Are you sure?",
//       text: "This will clear ALL partners. This action cannot be undone!",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, clear all!",
//       cancelButtonText: "No, cancel!",
//     });
//     if (result.isConfirmed) {
//       const snap = await getDocs(collection(db, "partners"));
//       for (const d of snap.docs) {
//         await deleteDoc(doc(db, "partners", d.id));
//       }
//       setPartners([]);
//       Swal.fire("Success!", "All partners cleared!", "success");
//     }
//   };

//   // 🔹 Start editing
//   const handleEdit = (partner) => {
//     setEditingId(partner.id);
//     setSelectedFemales(partner.females.map((f) => f.id));
//   };

//   // 🔹 Save updated females with uniqueness
//   const handleSave = async (partner) => {
//     if (selectedFemales.length === 0) {
//       return Swal.fire("Error!", "At least one female must be selected.", "error");
//     }

//     // Check if selected females are already paired in this event (excluding current partner)
//     const alreadyTaken = selectedFemales.filter((femaleId) =>
//       partners.some(
//         (p) =>
//           p.id !== partner.id &&
//           p.eventId === partner.eventId &&
//           p.females.some((f) => f.id === femaleId)
//       )
//     );
//     if (alreadyTaken.length > 0) {
//       return Swal.fire(
//         "Error!",
//         `The following females are already paired: ${females
//           .filter((f) => alreadyTaken.includes(f.id))
//           .map((f) => f.name)
//           .join(", ")}.`,
//         "error"
//       );
//     }

//     const updatedFemales = females.filter((f) =>
//       selectedFemales.includes(f.id)
//     );

//     // Update Firestore for current male
//     await updateDoc(doc(db, "partners", partner.id), {
//       females: updatedFemales,
//     });

//     // Update state
//     setPartners(
//       partners.map((p) =>
//         p.id === partner.id ? { ...p, females: updatedFemales } : p
//       )
//     );

//     setEditingId(null);
//     setSelectedFemales([]);
//     Swal.fire("Success!", "Partner updated successfully!", "success");
//   };

//   // 🔹 Group partners by event
//   const groupByEvent = () => {
//     const groups = {};
//     partners.forEach((p) => {
//       if (!groups[p.eventId]) groups[p.eventId] = [];
//       groups[p.eventId].push(p);
//     });
//     return groups;
//   };

//   return (
//     <div className="container mx-auto px-4 py-8">
//       {/* Header */}
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-800">Manage Partners</h1>
//           <p className="text-gray-600 mt-2">
//             Create and manage student partners for events
//           </p>
//         </div>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//         <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
//           <div>
//             <p className="text-gray-500 text-sm">Total Events</p>
//             <h3 className="text-2xl font-bold">{events.length}</h3>
//           </div>
//           <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
//             <FaCalendarAlt />
//           </div>
//         </div>
//         <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
//           <div>
//             <p className="text-gray-500 text-sm">Male Students</p>
//             <h3 className="text-2xl font-bold">{males.length}</h3>
//           </div>
//           <div className="p-3 rounded-full bg-blue-100 text-blue-600">
//             <FaMale />
//           </div>
//         </div>
//         <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
//           <div>
//             <p className="text-gray-500 text-sm">Female Students</p>
//             <h3 className="text-2xl font-bold">{females.length}</h3>
//           </div>
//           <div className="p-3 rounded-full bg-pink-100 text-pink-600">
//             <FaFemale />
//           </div>
//         </div>
//       </div>

//       {/* Controls */}
//       <div className="bg-white rounded-lg shadow p-6 mb-8">
//         <h2 className="text-xl font-semibold mb-4">Partner Controls</h2>
//         <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
//           <div className="col-span-2">
//             <label className="block text-sm font-medium mb-1">Select Event</label>
//             <select
//               value={selectedEvent}
//               onChange={(e) => setSelectedEvent(e.target.value)}
//               className="w-full border border-gray-300 rounded-md py-2 px-3"
//             >
//               <option value="">Select an event</option>
//               {events.map((ev) => (
//                 <option key={ev.id} value={ev.id}>
//                   {ev.title}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div className="flex items-end">
//             <button
//               onClick={handleGenerate}
//               className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
//             >
//               <FaRandom className="mr-2" /> Generate
//             </button>
//           </div>
//           <div className="flex items-end">
//             <button
//               onClick={() => setShowCreateForm(!showCreateForm)}
//               className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
//             >
//               <FaPlus className="mr-2" /> {showCreateForm ? "Cancel" : "Create Pairing"}
//             </button>
//           </div>
//           <div className="flex items-end">
//             <button
//               onClick={handleClearAll}
//               className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
//             >
//               <FaTrashAlt className="mr-2" /> Clear All
//             </button>
//           </div>
//         </div>

//         {/* Create Pairing Form */}
//         {showCreateForm && (
//           <div className="mt-6 border-t pt-6">
//             <h3 className="text-lg font-semibold mb-4">Create New Pairing</h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Select Male</label>
//                 <select
//                   value={createMale}
//                   onChange={(e) => setCreateMale(e.target.value)}
//                   className="w-full border border-gray-300 rounded-md py-2 px-3"
//                 >
//                   <option value="">Select a male</option>
//                   {males
//                     .filter(
//                       (m) =>
//                         !partners.some(
//                           (p) => p.eventId === selectedEvent && p.male.id === m.id
//                         )
//                     )
//                     .map((m) => (
//                       <option key={m.id} value={m.id}>
//                         {m.name} ({m.idNumber})
//                       </option>
//                     ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-1">Select Females</label>
//                 <select
//                   multiple
//                   value={createFemales}
//                   onChange={(e) =>
//                     setCreateFemales(
//                       Array.from(e.target.selectedOptions, (opt) => opt.value)
//                     )
//                   }
//                   className="w-full border border-gray-300 rounded-md p-2 h-40"
//                 >
//                   {females.map((f) => {
//                     const alreadyTaken = partners.some(
//                       (p) =>
//                         p.eventId === selectedEvent &&
//                         p.females.some((pf) => pf.id === f.id)
//                     );
//                     return (
//                       <option key={f.id} value={f.id} disabled={alreadyTaken}>
//                         {f.name} ({f.idNumber})
//                       </option>
//                     );
//                   })}
//                 </select>
//               </div>
//             </div>
//             <div className="mt-4 flex justify-end">
//               <button
//                 onClick={handleCreatePairing}
//                 className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center"
//               >
//                 <FaSave className="mr-2" /> Create
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Partners */}
//       <div className="bg-white rounded-lg shadow overflow-hidden">
//         <div className="px-6 py-4 border-b border-gray-200 flex justify-between">
//           <h2 className="text-xl font-semibold">Current Partners</h2>
//           <span className="text-sm text-gray-500">
//             {partners.length} partner{partners.length !== 1 ? "s" : ""}
//           </span>
//         </div>
//         <div className="divide-y divide-gray-200">
//           {partners.length === 0 ? (
//             <div className="p-6 text-center text-gray-500">
//               <FaUsersSlash className="text-4xl mb-3 opacity-30 mx-auto" />
//               <p>No partners generated yet</p>
//             </div>
//           ) : (
//             Object.entries(groupByEvent()).map(([eventId, eventPartners]) => {
//               const ev = events.find((e) => e.id === eventId);
//               return (
//                 <div key={eventId}>
//                   <div className="px-6 py-3 bg-gray-50 border-b">
//                     <h3 className="text-lg font-medium">
//                       {ev ? ev.title : "Unknown Event"}
//                     </h3>
//                     <p className="text-sm text-gray-500">
//                       {eventPartners.length} partners
//                     </p>
//                   </div>
//                   <table className="w-full text-left">
//                     <thead>
//                       <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
//                         <th className="px-6 py-3">#</th>
//                         <th className="px-6 py-3">Male</th>
//                         <th className="px-6 py-3">Females</th>
//                         <th className="px-6 py-3">Actions</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {eventPartners.map((partner, i) => (
//                         <tr key={partner.id || i} className="border-t">
//                           <td className="px-6 py-4">{i + 1}</td>
//                           <td className="px-6 py-4 flex flex-col">
//                             <span className="flex items-center">
//                               <FaMale className="text-blue-600 mr-2" />
//                               {partner.male.name}
//                             </span>
//                             <span className="ml-6 text-xs text-gray-500">
//                               ({partner.male.idNumber})
//                             </span>
//                           </td>
//                           <td className="px-6 py-4">
//                             {editingId === partner.id ? (
//                               <select
//                                 multiple
//                                 value={selectedFemales}
//                                 onChange={(e) =>
//                                   setSelectedFemales(
//                                     Array.from(
//                                       e.target.selectedOptions,
//                                       (opt) => opt.value
//                                     )
//                                   )
//                                 }
//                                 className="w-full border rounded p-2 h-40"
//                               >
//                                 {females.map((f) => {
//                                   const alreadyTaken = partners.some(
//                                     (p) =>
//                                       p.id !== partner.id &&
//                                       p.eventId === partner.eventId &&
//                                       p.females.some((pf) => pf.id === f.id)
//                                   );
//                                   return (
//                                     <option
//                                       key={f.id}
//                                       value={f.id}
//                                       disabled={alreadyTaken}
//                                     >
//                                       {f.name} ({f.idNumber})
//                                     </option>
//                                   );
//                                 })}
//                               </select>
//                             ) : (
//                               partner.females.map((f) => (
//                                 <span
//                                   key={f.id}
//                                   className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800 mr-2 mb-2"
//                                 >
//                                   <FaFemale className="text-pink-600 mr-1" />
//                                   {f.name}
//                                   <span className="ml-1 text-xs text-gray-500">
//                                     ({f.idNumber})
//                                   </span>
//                                 </span>
//                               ))
//                             )}
//                           </td>
//                           <td className="px-6 py-4">
//                             {editingId === partner.id ? (
//                               <div className="flex gap-2">
//                                 <button
//                                   onClick={() => handleSave(partner)}
//                                   className="bg-green-600 text-white px-3 py-1 rounded flex items-center"
//                                 >
//                                   <FaSave className="mr-1" /> Save
//                                 </button>
//                                 <button
//                                   onClick={() => setEditingId(null)}
//                                   className="bg-gray-400 text-white px-3 py-1 rounded flex items-center"
//                                 >
//                                   <FaTimes className="mr-1" /> Cancel
//                                 </button>
//                               </div>
//                             ) : (
//                               <button
//                                 onClick={() => handleEdit(partner)}
//                                 className="bg-blue-600 text-white px-3 py-1 rounded flex items-center"
//                               >
//                                 <FaEdit className="mr-1" /> Edit
//                               </button>
//                             )}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               );
//             })
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ManagePartners;


// import React, { useEffect, useState } from "react";
// import { db } from "./firebase";
// import {
//   collection,
//   getDocs,
//   addDoc,
//   deleteDoc,
//   doc,
//   query,
//   where,
//   updateDoc,
// } from "firebase/firestore";
// import {
//   FaCalendarAlt,
//   FaMale,
//   FaFemale,
//   FaRandom,
//   FaTrashAlt,
//   FaUsersSlash,
//   FaEdit,
//   FaSave,
//   FaTimes,
// } from "react-icons/fa";
// import Swal from "sweetalert2";

// const ManagePartners = () => {
//   const [events, setEvents] = useState([]);
//   const [students, setStudents] = useState([]);
//   const [partners, setPartners] = useState([]);
//   const [selectedEvent, setSelectedEvent] = useState("");
//   const [editingId, setEditingId] = useState(null);
//   const [selectedFemales, setSelectedFemales] = useState([]);

//   // 🔹 Fetch events, students, partners
//   useEffect(() => {
//     const fetchData = async () => {
//       const eventsSnap = await getDocs(collection(db, "events"));
//       setEvents(eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

//       const studentsSnap = await getDocs(collection(db, "students"));
//       setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

//       const partnersSnap = await getDocs(collection(db, "partners"));
//       setPartners(partnersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
//     };
//     fetchData();
//   }, []);

//   const males = students.filter((s) => s.gender?.toLowerCase() === "male");
//   const females = students.filter((s) => s.gender?.toLowerCase() === "female");

//   // 🔹 Generate fair partners
//   const handleGenerate = async () => {
//     if (!selectedEvent) {
//       return Swal.fire("Error!", "Please select an event first.", "error");
//     }
//     if (males.length === 0) {
//       return Swal.fire("Error!", "No male students found.", "error");
//     }
//     if (females.length === 0) {
//       return Swal.fire("Error!", "No female students found.", "error");
//     }
//     if (females.length < males.length) {
//       return Swal.fire(
//         "Error!",
//         "Not enough females to pair with all males.",
//         "error"
//       );
//     }

//     // 🔹 Clear existing partners for this event
//     const q = query(
//       collection(db, "partners"),
//       where("eventId", "==", selectedEvent)
//     );
//     const snap = await getDocs(q);
//     for (const d of snap.docs) {
//       await deleteDoc(doc(db, "partners", d.id));
//     }

//     // Step 1: Shuffle females
//     let shuffledFemales = [...females].sort(() => Math.random() - 0.5);

//     // Step 2: Give each male one female
//     const newPartners = [];
//     const usedFemales = new Set();

//     males.forEach((male, i) => {
//       const female = shuffledFemales[i];
//       if (female) {
//         usedFemales.add(female.id);
//         newPartners.push({
//           eventId: selectedEvent,
//           male,
//           females: [female],
//           createdAt: new Date(),
//         });
//       }
//     });

//     // Step 3: Distribute remaining females
//     let remainingFemales = shuffledFemales.filter(
//       (f) => !usedFemales.has(f.id)
//     );
//     let maleIndex = 0;
//     while (remainingFemales.length > 0) {
//       const female = remainingFemales.pop();
//       if (female) newPartners[maleIndex].females.push(female);
//       maleIndex = (maleIndex + 1) % males.length;
//     }

//     // 🔹 Save new partners in Firestore
//     const savedPartners = [];
//     for (const p of newPartners) {
//       const docRef = await addDoc(collection(db, "partners"), p);
//       savedPartners.push({ id: docRef.id, ...p });
//     }

//     setPartners((prev) => [
//       ...prev.filter((p) => p.eventId !== selectedEvent),
//       ...savedPartners,
//     ]);

//     Swal.fire("Success!", "Partners successfully generated!", "success");
//   };

//   // 🔹 Clear ALL partners
//   const handleClearAll = async () => {
//     if (partners.length === 0) {
//       return Swal.fire("Info", "No partners to clear.", "info");
//     }
//     const result = await Swal.fire({
//       title: "Are you sure?",
//       text: "This will clear ALL partners. This action cannot be undone!",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, clear all!",
//       cancelButtonText: "No, cancel!",
//     });
//     if (result.isConfirmed) {
//       const snap = await getDocs(collection(db, "partners"));
//       for (const d of snap.docs) {
//         await deleteDoc(doc(db, "partners", d.id));
//       }
//       setPartners([]);
//       Swal.fire("Success!", "All partners cleared!", "success");
//     }
//   };

//   // 🔹 Start editing
//   const handleEdit = (partner) => {
//     setEditingId(partner.id);
//     setSelectedFemales(partner.females.map((f) => f.id));
//   };

//   // 🔹 Save updated females with uniqueness
//   const handleSave = async (partner) => {
//     if (selectedFemales.length === 0) {
//       return Swal.fire("Error!", "At least one female must be selected.", "error");
//     }

//     const updatedFemales = females.filter((f) =>
//       selectedFemales.includes(f.id)
//     );

//     // Remove these females from other partners in same event
//     const updatedPartners = await Promise.all(
//       partners.map(async (p) => {
//         if (p.id !== partner.id && p.eventId === partner.eventId) {
//           const newFemales = p.females.filter(
//             (f) => !selectedFemales.includes(f.id)
//           );
//           if (newFemales.length !== p.females.length) {
//             await updateDoc(doc(db, "partners", p.id), { females: newFemales });
//             return { ...p, females: newFemales };
//           }
//         }
//         return p;
//       })
//     );

//     // Update Firestore for current male
//     await updateDoc(doc(db, "partners", partner.id), {
//       females: updatedFemales,
//     });

//     // Update state
//     setPartners(
//       updatedPartners.map((p) =>
//         p.id === partner.id ? { ...p, females: updatedFemales } : p
//       )
//     );

//     setEditingId(null);
//     setSelectedFemales([]);
//     Swal.fire("Success!", "Partner updated successfully!", "success");
//   };

//   // 🔹 Group partners by event
//   const groupByEvent = () => {
//     const groups = {};
//     partners.forEach((p) => {
//       if (!groups[p.eventId]) groups[p.eventId] = [];
//       groups[p.eventId].push(p);
//     });
//     return groups;
//   };

//   return (
//     <div className="container mx-auto px-4 py-8">
//       {/* Header */}
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-800">Manage Partners</h1>
//           <p className="text-gray-600 mt-2">
//             Create and manage student partners for events
//           </p>
//         </div>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//         <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
//           <div>
//             <p className="text-gray-500 text-sm">Total Events</p>
//             <h3 className="text-2xl font-bold">{events.length}</h3>
//           </div>
//           <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
//             <FaCalendarAlt />
//           </div>
//         </div>
//         <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
//           <div>
//             <p className="text-gray-500 text-sm">Male Students</p>
//             <h3 className="text-2xl font-bold">{males.length}</h3>
//           </div>
//           <div className="p-3 rounded-full bg-blue-100 text-blue-600">
//             <FaMale />
//           </div>
//         </div>
//         <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
//           <div>
//             <p className="text-gray-500 text-sm">Female Students</p>
//             <h3 className="text-2xl font-bold">{females.length}</h3>
//           </div>
//           <div className="p-3 rounded-full bg-pink-100 text-pink-600">
//             <FaFemale />
//           </div>
//         </div>
//       </div>

//       {/* Controls */}
//       <div className="bg-white rounded-lg shadow p-6 mb-8">
//         <h2 className="text-xl font-semibold mb-4">Partner Controls</h2>
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//           <div className="col-span-2">
//             <label className="block text-sm font-medium mb-1">Select Event</label>
//             <select
//               value={selectedEvent}
//               onChange={(e) => setSelectedEvent(e.target.value)}
//               className="w-full border border-gray-300 rounded-md py-2 px-3"
//             >
//               <option value="">Select an event</option>
//               {events.map((ev) => (
//                 <option key={ev.id} value={ev.id}>
//                   {ev.title}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div className="flex items-end">
//             <button
//               onClick={handleGenerate}
//               className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
//             >
//               <FaRandom className="mr-2" /> Generate
//             </button>
//           </div>
//           <div className="flex items-end">
//             <button
//               onClick={handleClearAll}
//               className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
//             >
//               <FaTrashAlt className="mr-2" /> Clear All
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Partners */}
//       <div className="bg-white rounded-lg shadow overflow-hidden">
//         <div className="px-6 py-4 border-b border-gray-200 flex justify-between">
//           <h2 className="text-xl font-semibold">Current Partners</h2>
//           <span className="text-sm text-gray-500">
//             {partners.length} partner{partners.length !== 1 ? "s" : ""}
//           </span>
//         </div>
//         <div className="divide-y divide-gray-200">
//           {partners.length === 0 ? (
//             <div className="p-6 text-center text-gray-500">
//               <FaUsersSlash className="text-4xl mb-3 opacity-30 mx-auto" />
//               <p>No partners generated yet</p>
//             </div>
//           ) : (
//             Object.entries(groupByEvent()).map(([eventId, eventPartners]) => {
//               const ev = events.find((e) => e.id === eventId);
//               return (
//                 <div key={eventId}>
//                   <div className="px-6 py-3 bg-gray-50 border-b">
//                     <h3 className="text-lg font-medium">
//                       {ev ? ev.title : "Unknown Event"}
//                     </h3>
//                     <p className="text-sm text-gray-500">
//                       {eventPartners.length} partners
//                     </p>
//                   </div>
//                   <table className="w-full text-left">
//                     <thead>
//                       <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
//                         <th className="px-6 py-3">#</th>
//                         <th className="px-6 py-3">Male</th>
//                         <th className="px-6 py-3">Females</th>
//                         <th className="px-6 py-3">Actions</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {eventPartners.map((partner, i) => (
//                         <tr key={partner.id || i} className="border-t">
//                           <td className="px-6 py-4">{i + 1}</td>
//                           <td className="px-6 py-4 flex flex-col">
//                             <span className="flex items-center">
//                               <FaMale className="text-blue-600 mr-2" />
//                               {partner.male.name}
//                             </span>
//                             <span className="ml-6 text-xs text-gray-500">
//                               ({partner.male.idNumber})
//                             </span>
//                           </td>
//                           <td className="px-6 py-4">
//                             {editingId === partner.id ? (
//                               <select
//                                 multiple
//                                 value={selectedFemales}
//                                 onChange={(e) =>
//                                   setSelectedFemales(
//                                     Array.from(
//                                       e.target.selectedOptions,
//                                       (opt) => opt.value
//                                     )
//                                   )
//                                 }
//                                 className="w-full border rounded p-2"
//                               >
//                                 {females.map((f) => {
//                                   const alreadyTaken = partners.some(
//                                     (p) =>
//                                       p.id !== partner.id &&
//                                       p.eventId === partner.eventId &&
//                                       p.females.some((pf) => pf.id === f.id)
//                                   );
//                                   return (
//                                     <option
//                                       key={f.id}
//                                       value={f.id}
//                                       disabled={alreadyTaken}
//                                     >
//                                       {f.name} ({f.idNumber})
//                                     </option>
//                                   );
//                                 })}
//                               </select>
//                             ) : (
//                               partner.females.map((f) => (
//                                 <span
//                                   key={f.id}
//                                   className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800 mr-2"
//                                 >
//                                   <FaFemale className="text-pink-600 mr-1" />
//                                   {f.name}
//                                   <span className="ml-1 text-xs text-gray-500">
//                                     ({f.idNumber})
//                                   </span>
//                                 </span>
//                               ))
//                             )}
//                           </td>
//                           <td className="px-6 py-4">
//                             {editingId === partner.id ? (
//                               <div className="flex gap-2">
//                                 <button
//                                   onClick={() => handleSave(partner)}
//                                   className="bg-green-600 text-white px-3 py-1 rounded flex items-center"
//                                 >
//                                   <FaSave className="mr-1" /> Save
//                                 </button>
//                                 <button
//                                   onClick={() => setEditingId(null)}
//                                   className="bg-gray-400 text-white px-3 py-1 rounded flex items-center"
//                                 >
//                                   <FaTimes className="mr-1" /> Cancel
//                                 </button>
//                               </div>
//                             ) : (
//                               <button
//                                 onClick={() => handleEdit(partner)}
//                                 className="bg-blue-600 text-white px-3 py-1 rounded flex items-center"
//                               >
//                                 <FaEdit className="mr-1" /> Edit
//                               </button>
//                             )}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               );
//             })
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ManagePartners;