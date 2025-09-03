import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHeart } from "react-icons/fa";

const SplashScreen = () => {
  const [fadeOut, setFadeOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        navigate("/student-login"); // redirect after fade
      }, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 text-white flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? "opacity-0 invisible" : "opacity-100"
      }`}
    >
      <div className="text-center px-4">
        {/* Floating heart */}
        <div className="animate-bounce mb-8">
          <FaHeart className="text-red-500 text-7xl" />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
          blindDate
        </h1>
        <p className="text-xl md:text-2xl opacity-90 mb-12 font-light">
          Find your perfect hostel match
        </p>

        {/* Loader */}
        <div className="mt-8 flex justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-pink-300 border-b-transparent rounded-full animate-spin [animation-delay:200ms]"></div>
          </div>
        </div>

        {/* Footer message */}
        <div className="mt-12 text-sm opacity-70">
          <p>Connecting you to exciting possibilities...</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
