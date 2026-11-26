import { useNavigate } from 'react-router-dom';
import { Satellite, ArrowLeft, Home } from 'lucide-react';
import { authAPI } from '@/services/authAPI';

export default function NotFound() {
  const navigate = useNavigate();
  const user = authAPI.getStoredUser();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Satellite className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">AgriVision AI</span>
        </div>

        {/* 404 */}
        <div className="mb-6">
          <p className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 leading-none">
            404
          </p>
          <h1 className="text-2xl font-bold text-white mt-4">Page not found</h1>
          <p className="text-gray-400 mt-2 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm font-medium rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <button
            onClick={() => navigate(user ? (user.role === 'admin' ? '/admin' : '/farmer') : '/auth')}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
