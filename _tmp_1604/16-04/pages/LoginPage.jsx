import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { saveUser } from "../services/userService";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user) {
      window.location.href = "/";
    }
  }, [navigate]);

  const handleGoogleSuccess = async (res) => {
    const user = jwtDecode(res.credential);

    const userData = {
      id: user.email,
      name: user.name,
      email: user.email,
      picture:
        user.picture ||
        "https://ui-avatars.com/api/?name=" + user.name,
    };

    localStorage.setItem("user", JSON.stringify(userData));

    try {
      await saveUser(userData);
    } catch (error) {
      console.error("Error saving user:", error);
    }

    window.location.href = "/";
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email) {
      alert("Enter your Gmail");
      return;
    }

    const userData = {
      id: email,
      name: email,
      email: email,
      picture: "https://ui-avatars.com/api/?name=" + email,
    };

    localStorage.setItem("user", JSON.stringify(userData));

    try {
      await saveUser(userData);
    } catch (error) {
      console.error("Error saving user:", error);
    }

    navigate("/");
  };

  const handleForgotPassword = () => {
    window.open("https://accounts.google.com/signin/recovery", "_blank");
  };

  const handleSignup = () => {
    window.open("https://accounts.google.com/signup", "_blank");
  };

  return (
    <div className="h-screen flex items-center justify-center 
    bg-gradient-to-br from-indigo-100 via-blue-100 to-purple-100">

      <div className="backdrop-blur-xl bg-white/70 border border-white/30 
      w-[380px] p-8 rounded-3xl shadow-xl">

        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-800">
          Welcome 👋
        </h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">

          <input
            type="email"
            placeholder="Enter your Gmail"
            value={email}
            required={true}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white border border-gray-300 
            focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800"
          />

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            required={true}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white border border-gray-300 
            focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800"
          />

          <div
            onClick={handleForgotPassword}
            className="text-right text-sm text-indigo-500 hover:underline cursor-pointer"
          >
            Forgot password?
          </div>

          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-500 to-purple-500 
            hover:from-indigo-600 hover:to-purple-600 
            text-white py-3 rounded-xl transition shadow-lg"
          >
            Login
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-gray-400 text-sm">OR</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => console.log("Login Failed")}
          />
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don’t have an account?{" "}
          <span
            onClick={handleSignup}
            className="text-indigo-600 font-medium cursor-pointer hover:underline"
          >
            Sign up
          </span>
        </p>

      </div>
    </div>
  );
}