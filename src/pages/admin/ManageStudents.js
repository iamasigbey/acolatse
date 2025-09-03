import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faDownload,
  faUpload,
  faTimesCircle,
  faUser,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import Swal from "sweetalert2";
import axios from "axios";

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newStudent, setNewStudent] = useState({
    idNumber: "",
    name: "",
    phone: "",
    gender: "",
    hall: "",
    room: "",
  });
  const [editingStudent, setEditingStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Fetch students
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const studentsCollection = collection(db, "students");
      const studentsSnapshot = await getDocs(studentsCollection);
      const studentsList = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(studentsList);
    } catch (err) {
      console.error("Error fetching students:", err);
      Swal.fire("Error!", "Failed to fetch students.", "error");
    }
  };

  // Normalize ID number and phone to start with 0
  const normalizeInput = (value) => {
    return value && !value.startsWith("0") ? `0${value}` : value;
  };

  // Input changes with normalization
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const normalizedValue = name === "idNumber" || name === "phone" ? normalizeInput(value) : value;
    if (editingStudent) {
      setEditingStudent({ ...editingStudent, [name]: normalizedValue });
    } else {
      setNewStudent({ ...newStudent, [name]: normalizedValue });
    }
  };

  // Add or Update student
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const studentData = editingStudent || newStudent;
      const { idNumber, name, phone, gender, hall, room } = studentData;

      // Validate inputs
      if (!idNumber || !name || !phone || !gender || !hall || !room) {
        Swal.fire("Error!", "All fields are required.", "error");
        return;
      }

      // Ensure idNumber and phone start with 0
      const normalizedIdNumber = normalizeInput(idNumber);
      const normalizedPhone = normalizeInput(phone);

      if (editingStudent) {
        // Update existing student
        const studentRef = doc(db, "students", editingStudent.id);
        await updateDoc(studentRef, {
          idNumber: normalizedIdNumber,
          name,
          phone: normalizedPhone,
          gender,
          hall,
          room,
        });
        Swal.fire("Success!", "Student updated successfully.", "success");
        setEditingStudent(null);
      } else {
        // Check for duplicate by ID Number
        const q = query(
          collection(db, "students"),
          where("idNumber", "==", normalizedIdNumber)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          Swal.fire("Error!", "Student with this ID Number already exists!", "error");
          return;
        }

        // Create anonymous Firebase Authentication user
        const response = await axios.post("http://localhost:5000/create-anonymous-user", {
          idNumber: normalizedIdNumber,
        });
        if (!response.data.success) {
          Swal.fire("Error!", response.data.error || "Failed to create anonymous user.", "error");
          return;
        }

        // Add student to Firestore with idNumber as document ID
        await setDoc(doc(db, "students", normalizedIdNumber), {
          idNumber: normalizedIdNumber,
          name,
          phone: normalizedPhone,
          gender,
          hall,
          room,
        });
        Swal.fire("Success!", "Student added successfully.", "success");
      }
      setNewStudent({
        idNumber: "",
        name: "",
        phone: "",
        gender: "",
        hall: "",
        room: "",
      });
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      Swal.fire("Error!", `Failed to process request: ${err.message}`, "error");
    }
  };

  // Delete single student
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
    });
    if (result.isConfirmed) {
      try {
        // Delete from Firestore
        await deleteDoc(doc(db, "students", id));
        // Delete from Firebase Authentication
        try {
          await axios.post("http://localhost:5000/delete-user", { idNumber: id });
        } catch (authErr) {
          console.warn(`Failed to delete Firebase Auth user ${id}:`, authErr.response?.data || authErr.message);
        }
        setStudents(students.filter((student) => student.id !== id));
        Swal.fire("Deleted!", "Student has been deleted.", "success");
      } catch (err) {
        console.error("Error deleting student:", err);
        Swal.fire("Error!", `Failed to delete student: ${err.message}`, "error");
      }
    }
  };

  // Clear all students
  const handleClearAll = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will clear all students. This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, clear all!",
      cancelButtonText: "No, cancel!",
    });
    if (result.isConfirmed) {
      try {
        const snapshot = await getDocs(collection(db, "students"));
        const failedDeletions = [];

        for (const s of snapshot.docs) {
          try {
            // Delete from Firestore
            await deleteDoc(doc(db, "students", s.id));
            // Delete from Firebase Authentication
            try {
              await axios.post("http://localhost:5000/delete-user", { idNumber: s.id });
            } catch (authErr) {
              console.warn(`Failed to delete Firebase Auth user ${s.id}:`, authErr.response?.data || authErr.message);
              failedDeletions.push(s.id);
            }
          } catch (err) {
            console.error(`Error deleting student ${s.id}:`, err);
            failedDeletions.push(s.id);
          }
        }

        if (failedDeletions.length > 0) {
          Swal.fire(
            "Warning!",
            `Some students could not be deleted: ${failedDeletions.join(", ")}`,
            "warning"
          );
        } else {
          Swal.fire("Cleared!", "All students have been cleared.", "success");
        }
        setStudents([]);
        fetchStudents();
      } catch (err) {
        console.error("Error clearing students:", err);
        Swal.fire("Error!", `Failed to clear students: ${err.message}`, "error");
      }
    }
  };

  // Edit student
  const handleEdit = (student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  // Search filter
  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // CSV Download
  const handleDownload = () => {
    const headers = ["ID Number", "Name", "Phone", "Gender", "Hall", "Room"];
    const csvRows = [
      headers.join(","),
      ...students.map(
        (s) =>
          `${s.idNumber},${s.name},${s.phone},${s.gender},${s.hall},${s.room}`
      ),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Swal.fire("Success!", "CSV file downloaded successfully.", "success");
  };

  // CSV Upload with duplicate prevention and normalization
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split("\n").slice(1); // Skip header
      setUploading(true);
      setUploadProgress({ current: 0, total: rows.length });
      let successCount = 0;
      const failedUploads = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.trim()) continue;
        let [idNumber, name, phone, gender, hall, room] = row
          .split(",")
          .map((cell) => cell.trim());

        // Normalize idNumber and phone
        idNumber = normalizeInput(idNumber);
        phone = normalizeInput(phone);

        try {
          // Check for duplicate by ID Number
          const q = query(
            collection(db, "students"),
            where("idNumber", "==", idNumber)
          );
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            // Create anonymous Firebase Authentication user
            const response = await axios.post("http://localhost:5000/create-anonymous-user", {
              idNumber,
            });
            if (response.data.success) {
              // Add student to Firestore with idNumber as document ID
              await setDoc(doc(db, "students", idNumber), {
                idNumber,
                name,
                phone,
                gender,
                hall,
                room,
              });
              successCount++;
            } else {
              throw new Error(response.data.error || "Failed to create anonymous user");
            }
          } else {
            failedUploads.push(idNumber);
          }
        } catch (err) {
          console.error(`Error uploading student ${idNumber}:`, err);
          failedUploads.push(idNumber);
        }

        setUploadProgress({ current: i + 1, total: rows.length });
      }

      setUploading(false);
      if (failedUploads.length > 0) {
        Swal.fire(
          "Warning!",
          `Successfully uploaded ${successCount} students. Failed to upload: ${failedUploads.join(", ")}`,
          "warning"
        );
      } else {
        Swal.fire(
          "Success!",
          `Successfully uploaded ${successCount} students.`,
          "success"
        );
      }
      fetchStudents();
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  return (
    <section className="bg-white rounded-lg shadow mb-6">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Manage Students</h2>
      </div>

      <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditingStudent(null);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <button
              onClick={handleDownload}
              className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700"
            >
              <FontAwesomeIcon icon={faDownload} />
            </button>
            <label className="bg-yellow-600 text-white p-2 rounded-md hover:bg-yellow-700 cursor-pointer">
              <FontAwesomeIcon icon={faUpload} />
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
            <button
              onClick={handleClearAll}
              className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700"
            >
              <FontAwesomeIcon icon={faTimesCircle} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded-md p-2 w-64"
          />
        </div>

        {/* Uploading Loader */}
        {uploading && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md">
            Uploading {uploadProgress.current} of {uploadProgress.total}…
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "SN",
                  "ID NUMBER",
                  "Name",
                  "GENDER",
                  "HALL",
                  "ROOM NUMBER",
                  "Actions",
                ].map((header, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student, index) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.idNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <FontAwesomeIcon
                          icon={faUser}
                          className="text-indigo-600"
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {student.name}
                        </div>
                        <div className="text-sm text-gray-500">{student.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.gender}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {student.hall}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {student.room}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(student)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editingStudent ? "Edit Student" : "Add Student"}
            </h3>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <input
                type="text"
                name="idNumber"
                value={
                  editingStudent ? editingStudent.idNumber : newStudent.idNumber
                }
                onChange={handleInputChange}
                placeholder="ID Number"
                className="border rounded-md p-2"
                required
              />
              <input
                type="text"
                name="name"
                value={editingStudent ? editingStudent.name : newStudent.name}
                onChange={handleInputChange}
                placeholder="Name"
                className="border rounded-md p-2"
                required
              />
              <input
                type="text"
                name="phone"
                value={editingStudent ? editingStudent.phone : newStudent.phone}
                onChange={handleInputChange}
                placeholder="Phone"
                className="border rounded-md p-2"
                required
              />
              <select
                name="gender"
                value={editingStudent ? editingStudent.gender : newStudent.gender}
                onChange={handleInputChange}
                className="border rounded-md p-2"
                required
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
              <input
                type="text"
                name="hall"
                value={editingStudent ? editingStudent.hall : newStudent.hall}
                onChange={handleInputChange}
                placeholder="Hall"
                className="border rounded-md p-2"
                required
              />
              <input
                type="text"
                name="room"
                value={editingStudent ? editingStudent.room : newStudent.room}
                onChange={handleInputChange}
                placeholder="Room Number"
                className="border rounded-md p-2"
                required
              />
              <div className="col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingStudent ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ManageStudents;


// import React, { useState, useEffect } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faPlus,
//   faDownload,
//   faUpload,
//   faTimesCircle,
//   faUser,
//   faEdit,
//   faTrash,
// } from "@fortawesome/free-solid-svg-icons";
// import { db } from "./firebase";
// import {
//   collection,
//   getDocs,
//   setDoc,
//   updateDoc,
//   deleteDoc,
//   doc,
//   query,
//   where,
// } from "firebase/firestore";
// import Swal from "sweetalert2";
// import axios from "axios";

// const ManageStudents = () => {
//   const [students, setStudents] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [newStudent, setNewStudent] = useState({
//     idNumber: "",
//     name: "",
//     phone: "",
//     gender: "",
//     hall: "",
//     room: "",
//   });
//   const [editingStudent, setEditingStudent] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

//   // Fetch students
//   useEffect(() => {
//     fetchStudents();
//   }, []);

//   const fetchStudents = async () => {
//     try {
//       const studentsCollection = collection(db, "students");
//       const studentsSnapshot = await getDocs(studentsCollection);
//       const studentsList = studentsSnapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       }));
//       setStudents(studentsList);
//     } catch (err) {
//       console.error("Error fetching students:", err);
//       Swal.fire("Error!", "Failed to fetch students.", "error");
//     }
//   };

//   // Input changes
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     if (editingStudent) {
//       setEditingStudent({ ...editingStudent, [name]: value });
//     } else {
//       setNewStudent({ ...newStudent, [name]: value });
//     }
//   };

//   // Add or Update student
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       if (editingStudent) {
//         // Update existing student
//         const studentRef = doc(db, "students", editingStudent.id);
//         await updateDoc(studentRef, {
//           idNumber: editingStudent.idNumber,
//           name: editingStudent.name,
//           phone: editingStudent.phone,
//           gender: editingStudent.gender,
//           hall: editingStudent.hall,
//           room: editingStudent.room,
//         });
//         Swal.fire("Success!", "Student updated successfully.", "success");
//         setEditingStudent(null);
//       } else {
//         // Check for duplicate by ID Number
//         const q = query(
//           collection(db, "students"),
//           where("idNumber", "==", newStudent.idNumber)
//         );
//         const snapshot = await getDocs(q);
//         if (!snapshot.empty) {
//           Swal.fire("Error!", "Student with this ID Number already exists!", "error");
//           return;
//         }

//         // Create anonymous Firebase Authentication user
//         const response = await axios.post("http://localhost:5000/create-anonymous-user", {
//           idNumber: newStudent.idNumber,
//         });
//         if (!response.data.success) {
//           Swal.fire("Error!", response.data.error || "Failed to create anonymous user.", "error");
//           return;
//         }

//         // Add student to Firestore with idNumber as document ID
//         await setDoc(doc(db, "students", newStudent.idNumber), newStudent);
//         Swal.fire("Success!", "Student added successfully.", "success");
//       }
//       setNewStudent({
//         idNumber: "",
//         name: "",
//         phone: "",
//         gender: "",
//         hall: "",
//         room: "",
//       });
//       setIsModalOpen(false);
//       fetchStudents();
//     } catch (err) {
//       console.error("Error in handleSubmit:", err);
//       Swal.fire("Error!", `Failed to process request: ${err.message}`, "error");
//     }
//   };

//   // Delete single student
//   const handleDelete = async (id) => {
//     const result = await Swal.fire({
//       title: "Are you sure?",
//       text: "You won't be able to revert this!",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, delete it!",
//       cancelButtonText: "No, cancel!",
//     });
//     if (result.isConfirmed) {
//       try {
//         // Delete from Firestore
//         await deleteDoc(doc(db, "students", id));
//         // Delete from Firebase Authentication
//         try {
//           await axios.post("http://localhost:5000/delete-user", { idNumber: id });
//         } catch (authErr) {
//           console.warn(`Failed to delete Firebase Auth user ${id}:`, authErr.response?.data || authErr.message);
//           // Continue even if auth deletion fails (e.g., user doesn't exist)
//         }
//         setStudents(students.filter((student) => student.id !== id));
//         Swal.fire("Deleted!", "Student has been deleted.", "success");
//       } catch (err) {
//         console.error("Error deleting student:", err);
//         Swal.fire("Error!", `Failed to delete student: ${err.message}`, "error");
//       }
//     }
//   };

//   // Clear all students
//   const handleClearAll = async () => {
//     const result = await Swal.fire({
//       title: "Are you sure?",
//       text: "This will clear all students. This action cannot be undone!",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, clear all!",
//       cancelButtonText: "No, cancel!",
//     });
//     if (result.isConfirmed) {
//       try {
//         const snapshot = await getDocs(collection(db, "students"));
//         const failedDeletions = [];
        
//         for (const s of snapshot.docs) {
//           try {
//             // Delete from Firestore
//             await deleteDoc(doc(db, "students", s.id));
//             // Delete from Firebase Authentication
//             try {
//               await axios.post("http://localhost:5000/delete-user", { idNumber: s.id });
//             } catch (authErr) {
//               console.warn(`Failed to delete Firebase Auth user ${s.id}:`, authErr.response?.data || authErr.message);
//               failedDeletions.push(s.id);
//             }
//           } catch (err) {
//             console.error(`Error deleting student ${s.id}:`, err);
//             failedDeletions.push(s.id);
//           }
//         }

//         if (failedDeletions.length > 0) {
//           Swal.fire(
//             "Warning!",
//             `Some students could not be deleted: ${failedDeletions.join(", ")}`,
//             "warning"
//           );
//         } else {
//           Swal.fire("Cleared!", "All students have been cleared.", "success");
//         }
//         setStudents([]);
//         fetchStudents();
//       } catch (err) {
//         console.error("Error clearing students:", err);
//         Swal.fire("Error!", `Failed to clear students: ${err.message}`, "error");
//       }
//     }
//   };

//   // Edit student
//   const handleEdit = (student) => {
//     setEditingStudent(student);
//     setIsModalOpen(true);
//   };

//   // Search filter
//   const filteredStudents = students.filter((student) =>
//     student.name.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   // CSV Download
//   const handleDownload = () => {
//     const headers = ["ID Number", "Name", "Phone", "Gender", "Hall", "Room"];
//     const csvRows = [
//       headers.join(","),
//       ...students.map(
//         (s) =>
//           `${s.idNumber},${s.name},${s.phone},${s.gender},${s.hall},${s.room}`
//       ),
//     ];
//     const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.setAttribute("download", "students.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     Swal.fire("Success!", "CSV file downloaded successfully.", "success");
//   };

//   // CSV Upload with duplicate prevention
//   const handleUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = async (event) => {
//       const text = event.target.result;
//       const rows = text.split("\n").slice(1); // skip header
//       setUploading(true);
//       setUploadProgress({ current: 0, total: rows.length });
//       let successCount = 0;
//       const failedUploads = [];

//       for (let i = 0; i < rows.length; i++) {
//         const row = rows[i];
//         if (!row.trim()) continue;
//         const [idNumber, name, phone, gender, hall, room] = row
//           .split(",")
//           .map((cell) => cell.trim());

//         try {
//           // Check for duplicate by ID Number
//           const q = query(
//             collection(db, "students"),
//             where("idNumber", "==", idNumber)
//           );
//           const snapshot = await getDocs(q);
//           if (snapshot.empty) {
//             // Create anonymous Firebase Authentication user
//             const response = await axios.post("http://localhost:5000/create-anonymous-user", {
//               idNumber,
//             });
//             if (response.data.success) {
//               // Add student to Firestore with idNumber as document ID
//               await setDoc(doc(db, "students", idNumber), {
//                 idNumber,
//                 name,
//                 phone,
//                 gender,
//                 hall,
//                 room,
//               });
//               successCount++;
//             } else {
//               throw new Error(response.data.error || "Failed to create anonymous user");
//             }
//           } else {
//             failedUploads.push(idNumber);
//           }
//         } catch (err) {
//           console.error(`Error uploading student ${idNumber}:`, err);
//           failedUploads.push(idNumber);
//         }

//         setUploadProgress({ current: i + 1, total: rows.length });
//       }

//       setUploading(false);
//       if (failedUploads.length > 0) {
//         Swal.fire(
//           "Warning!",
//           `Successfully uploaded ${successCount} students. Failed to upload: ${failedUploads.join(", ")}`,
//           "warning"
//         );
//       } else {
//         Swal.fire(
//           "Success!",
//           `Successfully uploaded ${successCount} students.`,
//           "success"
//         );
//       }
//       fetchStudents();
//       e.target.value = null;
//     };
//     reader.readAsText(file);
//   };

//   return (
//     <section className="bg-white rounded-lg shadow mb-6">
//       <div className="p-6 border-b border-gray-200 flex justify-between items-center">
//         <h2 className="text-xl font-semibold text-gray-800">Manage Students</h2>
//       </div>

//       <div className="p-6">
//         {/* Toolbar */}
//         <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
//           <div className="flex gap-3">
//             <button
//               onClick={() => {
//                 setEditingStudent(null);
//                 setIsModalOpen(true);
//               }}
//               className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
//             >
//               <FontAwesomeIcon icon={faPlus} />
//             </button>
//             <button
//               onClick={handleDownload}
//               className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700"
//             >
//               <FontAwesomeIcon icon={faDownload} />
//             </button>
//             <label className="bg-yellow-600 text-white p-2 rounded-md hover:bg-yellow-700 cursor-pointer">
//               <FontAwesomeIcon icon={faUpload} />
//               <input
//                 type="file"
//                 accept=".csv"
//                 className="hidden"
//                 onChange={handleUpload}
//               />
//             </label>
//             <button
//               onClick={handleClearAll}
//               className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700"
//             >
//               <FontAwesomeIcon icon={faTimesCircle} />
//             </button>
//           </div>
//           <input
//             type="text"
//             placeholder="Search by name..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="border rounded-md p-2 w-64"
//           />
//         </div>

//         {/* Uploading Loader */}
//         {uploading && (
//           <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md">
//             Uploading {uploadProgress.current} of {uploadProgress.total}…
//           </div>
//         )}

//         {/* Table */}
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 {[
//                   "SN",
//                   "ID NUMBER",
//                   "Name",
//                   "GENDER",
//                   "HALL",
//                   "ROOM NUMBER",
//                   "Actions",
//                 ].map((header, index) => (
//                   <th
//                     key={index}
//                     className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
//                   >
//                     {header}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {filteredStudents.map((student, index) => (
//                 <tr key={student.id}>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                     {index + 1}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">{student.idNumber}</td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <div className="flex items-center">
//                       <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
//                         <FontAwesomeIcon
//                           icon={faUser}
//                           className="text-indigo-600"
//                         />
//                       </div>
//                       <div className="ml-4">
//                         <div className="text-sm font-medium text-gray-900">
//                           {student.name}
//                         </div>
//                         <div className="text-sm text-gray-500">{student.phone}</div>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                     {student.gender}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
//                       {student.hall}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
//                       {student.room}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                     <button
//                       onClick={() => handleEdit(student)}
//                       className="text-indigo-600 hover:text-indigo-900 mr-3"
//                     >
//                       <FontAwesomeIcon icon={faEdit} />
//                     </button>
//                     <button
//                       onClick={() => handleDelete(student.id)}
//                       className="text-red-600 hover:text-red-900"
//                     >
//                       <FontAwesomeIcon icon={faTrash} />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
//           <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg">
//             <h3 className="text-lg font-semibold mb-4">
//               {editingStudent ? "Edit Student" : "Add Student"}
//             </h3>
//             <form
//               onSubmit={handleSubmit}
//               className="grid grid-cols-1 md:grid-cols-2 gap-4"
//             >
//               <input
//                 type="text"
//                 name="idNumber"
//                 value={
//                   editingStudent ? editingStudent.idNumber : newStudent.idNumber
//                 }
//                 onChange={handleInputChange}
//                 placeholder="ID Number"
//                 className="border rounded-md p-2"
//                 required
//               />
//               <input
//                 type="text"
//                 name="name"
//                 value={editingStudent ? editingStudent.name : newStudent.name}
//                 onChange={handleInputChange}
//                 placeholder="Name"
//                 className="border rounded-md p-2"
//                 required
//               />
//               <input
//                 type="text"
//                 name="phone"
//                 value={editingStudent ? editingStudent.phone : newStudent.phone}
//                 onChange={handleInputChange}
//                 placeholder="Phone"
//                 className="border rounded-md p-2"
//                 required
//               />
//               <select
//                 name="gender"
//                 value={editingStudent ? editingStudent.gender : newStudent.gender}
//                 onChange={handleInputChange}
//                 className="border rounded-md p-2"
//                 required
//               >
//                 <option value="">Select Gender</option>
//                 <option value="MALE">Male</option>
//                 <option value="FEMALE">Female</option>
//               </select>
//               <input
//                 type="text"
//                 name="hall"
//                 value={editingStudent ? editingStudent.hall : newStudent.hall}
//                 onChange={handleInputChange}
//                 placeholder="Hall"
//                 className="border rounded-md p-2"
//                 required
//               />
//               <input
//                 type="text"
//                 name="room"
//                 value={editingStudent ? editingStudent.room : newStudent.room}
//                 onChange={handleInputChange}
//                 placeholder="Room Number"
//                 className="border rounded-md p-2"
//                 required
//               />
//               <div className="col-span-2 flex justify-end gap-3 mt-4">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setIsModalOpen(false);
//                     setEditingStudent(null);
//                   }}
//                   className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
//                 >
//                   {editingStudent ? "Update" : "Add"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </section>
//   );
// };

// export default ManageStudents;


// import React, { useState, useEffect } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faPlus,
//   faDownload,
//   faUpload,
//   faTimesCircle,
//   faUser,
//   faEdit,
//   faTrash,
// } from "@fortawesome/free-solid-svg-icons";
// import { db } from "./firebase";
// import {
//   collection,
//   getDocs,
//   addDoc,
//   updateDoc,
//   deleteDoc,
//   doc,
//   query,
//   where,
// } from "firebase/firestore";
// import Swal from "sweetalert2";

// const ManageStudents = () => {
//   const [students, setStudents] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [newStudent, setNewStudent] = useState({
//     idNumber: "",
//     name: "",
//     phone: "",
//     gender: "",
//     hall: "",
//     room: "",
//   });
//   const [editingStudent, setEditingStudent] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

//   // Fetch students
//   useEffect(() => {
//     fetchStudents();
//   }, []);

//   const fetchStudents = async () => {
//     const studentsCollection = collection(db, "students");
//     const studentsSnapshot = await getDocs(studentsCollection);
//     const studentsList = studentsSnapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));
//     setStudents(studentsList);
//   };

//   // Input changes
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     if (editingStudent) {
//       setEditingStudent({ ...editingStudent, [name]: value });
//     } else {
//       setNewStudent({ ...newStudent, [name]: value });
//     }
//   };

//   // Add or Update
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (editingStudent) {
//       const studentRef = doc(db, "students", editingStudent.id);
//       await updateDoc(studentRef, {
//         idNumber: editingStudent.idNumber,
//         name: editingStudent.name,
//         phone: editingStudent.phone,
//         gender: editingStudent.gender,
//         hall: editingStudent.hall,
//         room: editingStudent.room,
//       });
//       Swal.fire("Success!", "Student updated successfully.", "success");
//       setEditingStudent(null);
//     } else {
//       // Prevent duplicate by ID Number
//       const q = query(
//         collection(db, "students"),
//         where("idNumber", "==", newStudent.idNumber)
//       );
//       const snapshot = await getDocs(q);
//       if (!snapshot.empty) {
//         Swal.fire("Error!", "Student with this ID Number already exists!", "error");
//         return;
//       }
//       await addDoc(collection(db, "students"), newStudent);
//       Swal.fire("Success!", "Student added successfully.", "success");
//     }
//     setNewStudent({
//       idNumber: "",
//       name: "",
//       phone: "",
//       gender: "",
//       hall: "",
//       room: "",
//     });
//     setIsModalOpen(false);
//     fetchStudents();
//   };

//   // Delete single student
//   const handleDelete = async (id) => {
//     const result = await Swal.fire({
//       title: "Are you sure?",
//       text: "You won't be able to revert this!",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, delete it!",
//       cancelButtonText: "No, cancel!",
//     });
//     if (result.isConfirmed) {
//       await deleteDoc(doc(db, "students", id));
//       setStudents(students.filter((student) => student.id !== id));
//       Swal.fire("Deleted!", "Student has been deleted.", "success");
//     }
//   };

//   // Clear all students
//   const handleClearAll = async () => {
//     const result = await Swal.fire({
//       title: "Are you sure?",
//       text: "This will clear all students. This action cannot be undone!",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, clear all!",
//       cancelButtonText: "No, cancel!",
//     });
//     if (result.isConfirmed) {
//       const snapshot = await getDocs(collection(db, "students"));
//       for (const s of snapshot.docs) {
//         await deleteDoc(doc(db, "students", s.id));
//       }
//       setStudents([]);
//       Swal.fire("Cleared!", "All students have been cleared.", "success");
//     }
//   };

//   // Edit
//   const handleEdit = (student) => {
//     setEditingStudent(student);
//     setIsModalOpen(true);
//   };

//   // Search filter
//   const filteredStudents = students.filter((student) =>
//     student.name.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   // CSV Download
//   const handleDownload = () => {
//     const headers = ["ID Number", "Name", "Phone", "Gender", "Hall", "Room"];
//     const csvRows = [
//       headers.join(","),
//       ...students.map(
//         (s) =>
//           `${s.idNumber},${s.name},${s.phone},${s.gender},${s.hall},${s.room}`
//       ),
//     ];
//     const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.setAttribute("download", "students.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     Swal.fire("Success!", "CSV file downloaded successfully.", "success");
//   };

//   // CSV Upload with duplicate prevention
//   const handleUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = async (event) => {
//       const text = event.target.result;
//       const rows = text.split("\n").slice(1); // skip header
//       setUploading(true);
//       setUploadProgress({ current: 0, total: rows.length });
//       let successCount = 0;

//       for (let i = 0; i < rows.length; i++) {
//         const row = rows[i];
//         if (!row.trim()) continue;
//         const [idNumber, name, phone, gender, hall, room] = row
//           .split(",")
//           .map((cell) => cell.trim());

//         // Check for duplicate by ID Number
//         const q = query(
//           collection(db, "students"),
//           where("idNumber", "==", idNumber)
//         );
//         const snapshot = await getDocs(q);
//         if (snapshot.empty) {
//           await addDoc(collection(db, "students"), {
//             idNumber,
//             name,
//             phone,
//             gender,
//             hall,
//             room,
//           });
//           successCount++;
//         }

//         setUploadProgress({ current: i + 1, total: rows.length });
//       }

//       setUploading(false);
//       Swal.fire(
//         "Success!",
//         `Successfully uploaded ${successCount} students.`,
//         "success"
//       );
//       fetchStudents();

//       // Reset file input
//       e.target.value = null;
//     };
//     reader.readAsText(file);
//   };

//   return (
//     <section className="bg-white rounded-lg shadow mb-6">
//       <div className="p-6 border-b border-gray-200 flex justify-between items-center">
//         <h2 className="text-xl font-semibold text-gray-800">Manage Students</h2>
//       </div>

//       <div className="p-6">
//         {/* Toolbar */}
//         <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
//           <div className="flex gap-3">
//             <button
//               onClick={() => {
//                 setEditingStudent(null);
//                 setIsModalOpen(true);
//               }}
//               className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
//             >
//               <FontAwesomeIcon icon={faPlus} />
//             </button>
//             <button
//               onClick={handleDownload}
//               className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700"
//             >
//               <FontAwesomeIcon icon={faDownload} />
//             </button>
//             <label className="bg-yellow-600 text-white p-2 rounded-md hover:bg-yellow-700 cursor-pointer">
//               <FontAwesomeIcon icon={faUpload} />
//               <input
//                 type="file"
//                 accept=".csv"
//                 className="hidden"
//                 onChange={handleUpload}
//               />
//             </label>
//             <button
//               onClick={handleClearAll}
//               className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700"
//             >
//               <FontAwesomeIcon icon={faTimesCircle} />
//             </button>
//           </div>
//           <input
//             type="text"
//             placeholder="Search by name..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="border rounded-md p-2 w-64"
//           />
//         </div>

//         {/* Uploading Loader */}
//         {uploading && (
//           <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md">
//             Uploading {uploadProgress.current} of {uploadProgress.total}…
//           </div>
//         )}

//         {/* Table */}
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 {[
//                   "SN",
//                   "ID NUMBER",
//                   "Name",
//                   "GENDER",
//                   "HALL",
//                   "ROOM NUMBER",
//                   "Actions",
//                 ].map((header, index) => (
//                   <th
//                     key={index}
//                     className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
//                   >
//                     {header}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {filteredStudents.map((student, index) => (
//                 <tr key={student.id}>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                     {index + 1}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     {student.idNumber}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <div className="flex items-center">
//                       <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
//                         <FontAwesomeIcon
//                           icon={faUser}
//                           className="text-indigo-600"
//                         />
//                       </div>
//                       <div className="ml-4">
//                         <div className="text-sm font-medium text-gray-900">
//                           {student.name}
//                         </div>
//                         <div className="text-sm text-gray-500">
//                           {student.phone}
//                         </div>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                     {student.gender}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
//                       {student.hall}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
//                       {student.room}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                     <button
//                       onClick={() => handleEdit(student)}
//                       className="text-indigo-600 hover:text-indigo-900 mr-3"
//                     >
//                       <FontAwesomeIcon icon={faEdit} />
//                     </button>
//                     <button
//                       onClick={() => handleDelete(student.id)}
//                       className="text-red-600 hover:text-red-900"
//                     >
//                       <FontAwesomeIcon icon={faTrash} />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
//           <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg">
//             <h3 className="text-lg font-semibold mb-4">
//               {editingStudent ? "Edit Student" : "Add Student"}
//             </h3>
//             <form
//               onSubmit={handleSubmit}
//               className="grid grid-cols-1 md:grid-cols-2 gap-4"
//             >
//               <input
//                 type="text"
//                 name="idNumber"
//                 value={
//                   editingStudent ? editingStudent.idNumber : newStudent.idNumber
//                 }
//                 onChange={handleInputChange}
//                 placeholder="ID Number"
//                 className="border rounded-md p-2"
//                 required
//               />
//               <input
//                 type="text"
//                 name="name"
//                 value={editingStudent ? editingStudent.name : newStudent.name}
//                 onChange={handleInputChange}
//                 placeholder="Name"
//                 className="border rounded-md p-2"
//                 required
//               />
//               <input
//                 type="text"
//                 name="phone"
//                 value={
//                   editingStudent ? editingStudent.phone : newStudent.phone
//                 }
//                 onChange={handleInputChange}
//                 placeholder="Phone"
//                 className="border rounded-md p-2"
//                 required
//               />
//               <select
//                 name="gender"
//                 value={
//                   editingStudent ? editingStudent.gender : newStudent.gender
//                 }
//                 onChange={handleInputChange}
//                 className="border rounded-md p-2"
//                 required
//               >
//                 <option value="">Select Gender</option>
// /// Form continuation
//                 <option value="MALE">Male</option>
//                 <option value="FEMALE">Female</option>
//               </select>
//               <input
//                 type="text"
//                 name="hall"
//                 value={editingStudent ? editingStudent.hall : newStudent.hall}
//                 onChange={handleInputChange}
//                 placeholder="Hall"
//                 className="border rounded-md p-2"
//                 required
//               />
//               <input
//                 type="text"
//                 name="room"
//                 value={editingStudent ? editingStudent.room : newStudent.room}
//                 onChange={handleInputChange}
//                 placeholder="Room Number"
//                 className="border rounded-md p-2"
//                 required
//               />

//               <div className="col-span-2 flex justify-end gap-3 mt-4">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setIsModalOpen(false);
//                     setEditingStudent(null);
//                   }}
//                   className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
//                 >
//                   {editingStudent ? "Update" : "Add"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </section>
//   );
// };

// export default ManageStudents;