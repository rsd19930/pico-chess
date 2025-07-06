"use client"

// This modal appears when one player offers a draw to the other
// The receiving player can accept or decline the draw offer

// Props that this component receives
interface DrawOfferModalProps {
  onResponse: (accepted: boolean) => void // Function to call with the player's response
}

export function DrawOfferModal({ onResponse }: DrawOfferModalProps) {
  return (
    // Dark overlay that covers the entire screen
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* The actual modal content */}
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Draw Offer</h2>
        <p className="text-xl text-center mb-6">Your opponent has offered a draw. Do you accept?</p>

        {/* Response buttons */}
        <div className="flex justify-center space-x-4">
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => onResponse(true)} // Accept the draw
          >
            Accept
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => onResponse(false)} // Decline the draw
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
