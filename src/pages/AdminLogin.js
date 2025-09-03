import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import Swal from 'sweetalert2';
import { Button, CircularProgress, Checkbox, FormControlLabel } from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  const navigate = useNavigate();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError(!validateEmail(e.target.value) && e.target.value.length > 0);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setPasswordError(e.target.value.length < 6 && e.target.value.length > 0);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let isValid = true;

    if (!validateEmail(email)) {
      setEmailError(true);
      isValid = false;
    }
    if (password.length < 6) {
      setPasswordError(true);
      isValid = false;
    }

    if (!isValid) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Swal.fire({
        title: 'Success',
        text: 'Logged in as Admin!',
        icon: 'success',
        confirmButtonText: 'OK',
        timer: 1500,
      }).then(() => {
        navigate('/admin-dashboard');
      });
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-700">
      <div className="w-full max-w-md">
        <div
          className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 transform hover:scale-[1.01] ${
            shake ? 'animate-shake' : ''
          }`}
        >
          <div className="p-8">
            <div className="flex justify-center mb-8">
              <div className="bg-indigo-100 p-4 rounded-full">
                <Lock className="text-indigo-600" style={{ fontSize: 36 }} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">
              Admin Portal
            </h1>
            <p className="text-center text-gray-600 mb-8">
              Sign in to access the dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Email className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="admin@example.com"
                    value={email}
                    onChange={handleEmailChange}
                    className={`pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ${
                      emailError ? 'border-red-600' : ''
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="mt-1 text-sm text-red-600">
                    Please enter a valid email address
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    required
                    minLength="6"
                    placeholder="••••••••"
                    value={password}
                    onChange={handlePasswordChange}
                    className={`pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ${
                      passwordError ? 'border-red-600' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <VisibilityOff className="text-gray-400 hover:text-indigo-600" />
                    ) : (
                      <Visibility className="text-gray-400 hover:text-indigo-600" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <FormControlLabel
                  control={
                    <Checkbox
                      id="remember-me"
                      name="remember-me"
                      color="primary"
                    />
                  }
                  label="Remember me"
                  className="text-sm text-gray-700"
                />
                <div className="text-sm">
                  <a
                    href="#"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  variant="contained"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700"
                  style={{ textTransform: 'none' }}
                >
                  <span>Sign in</span>
                  {isLoading && (
                    <CircularProgress
                      size={20}
                      className="ml-2 text-white"
                    />
                  )}
                </Button>
              </div>
            </form>
          </div>

          <div className="bg-gray-50 px-8 py-4 rounded-b-xl text-center">
            <p className="text-sm text-gray-600">
              Secure access to your admin panel.{' '}
              <span className="block sm:inline">
                Need help?{' '}
                <a
                  href="#"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Contact support
                </a>
              </span>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-white">
            &copy; 2025 blindDate Admin Portal. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
// import React, { useState } from 'react';
// import { signInWithEmailAndPassword } from 'firebase/auth';
// import { auth } from '../firebase'; // Import from firebase.js
// import Swal from 'sweetalert2';
// import { Button, CircularProgress, Checkbox, FormControlLabel } from '@mui/material';
// import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
// import { useNavigate } from 'react-router-dom'

// const AdminLogin = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [emailError, setEmailError] = useState(false);
//   const [passwordError, setPasswordError] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [shake, setShake] = useState(false);

//   const navigate = useNavigate();
//   const validateEmail = (email) => {
//     const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return re.test(String(email).toLowerCase());
//   };

//   const handleEmailChange = (e) => {
//     setEmail(e.target.value);
//     setEmailError(!validateEmail(e.target.value) && e.target.value.length > 0);
//   };

//   const handlePasswordChange = (e) => {
//     setPassword(e.target.value);
//     setPasswordError(e.target.value.length < 6 && e.target.value.length > 0);
//   };

//   const togglePasswordVisibility = () => {
//     setShowPassword(!showPassword);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     let isValid = true;

//     if (!validateEmail(email)) {
//       setEmailError(true);
//       isValid = false;
//     }
//     if (password.length < 6) {
//       setPasswordError(true);
//       isValid = false;
//     }

//     if (!isValid) {
//       setShake(true);
//       setTimeout(() => setShake(false), 500);
//       return;
//     }

//     setIsLoading(true);
//     try {
//       await signInWithEmailAndPassword(auth, email, password);
//       Swal.fire({
//         title: 'Success',
//         text: 'Logged in as Admin!',
//         icon: 'success',
//         confirmButtonText: 'OK',
//         timer: 1500,
//       }).then(() => {
//         // TODO: Navigate to admin dashboard
//         navigate('/admin-dashboard');
//       });
//     } catch (error) {
//       Swal.fire({
//         title: 'Error',
//         text: error.message,
//         icon: 'error',
//         confirmButtonText: 'OK',
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-700">
//       <div className="w-full max-w-md">
//         <div
//           className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 transform hover:scale-[1.01] ${
//             shake ? 'animate-shake' : ''
//           }`}
//         >
//           <div className="p-8">
//             <div className="flex justify-center mb-8">
//               <div className="bg-indigo-100 p-4 rounded-full">
//                 <Lock className="text-indigo-600" style={{ fontSize: 36 }} />
//               </div>
//             </div>
//             <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">
//               Admin Portal
//             </h1>
//             <p className="text-center text-gray-600 mb-8">
//               Sign in to access the dashboard
//             </p>

//             <form onSubmit={handleSubmit} className="space-y-6">
//               <div>
//                 <label
//                   htmlFor="email"
//                   className="block text-sm font-medium text-gray-700 mb-1"
//                 >
//                   Email Address
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <Email className="text-gray-400" />
//                   </div>
//                   <input
//                     type="email"
//                     id="email"
//                     name="email"
//                     required
//                     placeholder="admin@example.com"
//                     value={email}
//                     onChange={handleEmailChange}
//                     className={`pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ${
//                       emailError ? 'border-red-600' : ''
//                     }`}
//                   />
//                 </div>
//                 {emailError && (
//                   <p className="mt-1 text-sm text-red-600">
//                     Please enter a valid email address
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <label
//                   htmlFor="password"
//                   className="block text-sm font-medium text-gray-700 mb-1"
//                 >
//                   Password
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <Lock className="text-gray-400" />
//                   </div>
//                   <input
//                     type={showPassword ? 'text' : 'password'}
//                     id="password"
//                     name="password"
//                     required
//                     minLength="6"
//                     placeholder="••••••••"
//                     value={password}
//                     onChange={handlePasswordChange}
//                     className={`pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ${
//                       passwordError ? 'border-red-600' : ''
//                     }`}
//                   />
//                   <button
//                     type="button"
//                     onClick={togglePasswordVisibility}
//                     className="absolute inset-y-0 right-0 pr-3 flex items-center"
//                   >
//                     {showPassword ? (
//                       <VisibilityOff className="text-gray-400 hover:text-indigo-600" />
//                     ) : (
//                       <Visibility className="text-gray-400 hover:text-indigo-600" />
//                     )}
//                   </button>
//                 </div>
//                 {passwordError && (
//                   <p className="mt-1 text-sm text-red-600">
//                     Password must be at least 6 characters
//                   </p>
//                 )}
//               </div>

//               <div className="flex items-center justify-between">
//                 <FormControlLabel
//                   control={
//                     <Checkbox
//                       id="remember-me"
//                       name="remember-me"
//                       color="primary"
//                     />
//                   }
//                   label="Remember me"
//                   className="text-sm text-gray-700"
//                 />
//                 <div className="text-sm">
//                   <a
//                     href="#"
//                     className="font-medium text-indigo-600 hover:text-indigo-500"
//                   >
//                     Forgot password?
//                   </a>
//                 </div>
//               </div>

//               <div>
//                 <Button
//                   type="submit"
//                   disabled={isLoading}
//                   variant="contained"
//                   className="w-full py-3 bg-indigo-600 hover:bg-indigo-700"
//                   style={{ textTransform: 'none' }}
//                 >
//                   <span>Sign in</span>
//                   {isLoading && (
//                     <CircularProgress
//                       size={20}
//                       className="ml-2 text-white"
//                     />
//                   )}
//                 </Button>
//               </div>
//             </form>
//           </div>

//           <div className="bg-gray-50 px-8 py-4 rounded-b-xl text-center">
//             <p className="text-sm text-gray-600">
//               Secure access to your admin panel.{' '}
//               <span className="block sm:inline">
//                 Need help?{' '}
//                 <a
//                   href="#"
//                   className="font-medium text-indigo-600 hover:text-indigo-500"
//                 >
//                   Contact support
//                 </a>
//               </span>
//             </p>
//           </div>
//         </div>

//         <div className="mt-6 text-center">
//           <p className="text-sm text-white">
//             &copy; 2025 blindDate Admin Portal. All rights reserved.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AdminLogin;