import React, { useState, useRef, useEffect } from 'react';

const OTPInput = ({ value, onChange, disabled }) => {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (value === "") {
      setOtp(new Array(6).fill(""));
    } else if (value && value.length === 6) {
      setOtp(value.split(''));
    }
  }, [value]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Trigger parent callback
    const combinedOtp = newOtp.join("");
    onChange(combinedOtp);

    // Move to next input if current is filled
    if (element.value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // If current is empty and backspace is pressed, focus previous
        inputRefs.current[index - 1].focus();
      } else {
        // Clear current
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
        onChange(newOtp.join(""));
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").slice(0, 6).replace(/\D/g, "");
    if (!pastedData) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    onChange(newOtp.join(""));

    // Focus the last filled input
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex].focus();
  };

  return (
    <div className="flex justify-center items-center space-x-2 sm:space-x-4 my-6">
      {otp.map((data, index) => (
        <input
          key={index}
          type="text"
          name="otp"
          maxLength="1"
          ref={(ref) => (inputRefs.current[index] = ref)}
          value={data}
          onChange={(e) => handleChange(e.target, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          autoComplete="off"
          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ))}
    </div>
  );
};

export default OTPInput;
