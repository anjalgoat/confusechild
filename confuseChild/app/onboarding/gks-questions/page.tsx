"use client";

import { useState, FormEvent, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// Define a type for your form data for better type safety
interface OnboardingFormData {
  q1_perfectionism_pressure: string;
  q2_fear_of_failure_feeling: string;
  q3_imposter_syndrome_doubt: string;
  q4_procrastination_pressure: string;
  q5_sense_of_alienation: string;
  q6_career_dissatisfaction: string;
}

const initialFormData: OnboardingFormData = {
  q1_perfectionism_pressure: "",
  q2_fear_of_failure_feeling: "",
  q3_imposter_syndrome_doubt: "",
  q4_procrastination_pressure: "",
  q5_sense_of_alienation: "",
  q6_career_dissatisfaction: "",
};

export default function GKSOnboardingPage() {
  const { isSignedIn, isLoaded: clerkUserLoaded } = useUser();
  const saveResponses = useMutation(api.users.saveOnboardingResponses);
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const userProfile = useQuery(api.users.getMyUserProfile);

  useEffect(() => {
    if (clerkUserLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isSignedIn, clerkUserLoaded, router]);

  useEffect(() => {
    if (userProfile && userProfile.onboardingCompleted) {
      router.push("/dashboard");
    }
  }, [userProfile, router]);


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const allFieldsFilled = Object.values(formData).every(val => val.trim() !== "");
    if (!allFieldsFilled) {
      setError("Please answer all questions.");
      setIsLoading(false);
      return;
    }

    try {
      // **THE FIX: This section transforms the form's flat object into an array.**
      const responsesArray = Object.entries(formData).map(([question, answer]) => ({
        question,
        answer,
      }));

      // Log the exact object we are about to send to the backend.
      console.log("[FRONTEND LOG] Payload sent to saveOnboardingResponses:", { responses: responsesArray })

      // **THE FIX: This section calls the mutation with the correctly formatted object.**
      await saveResponses({
        responses: responsesArray
      });

      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to save onboarding responses:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!clerkUserLoaded || userProfile === undefined) {
    return <div className="flex justify-center items-center min-h-screen">Loading onboarding...</div>;
  }
   if (userProfile && userProfile.onboardingCompleted) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Tell Us About Yourself
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your answers will help us tailor your experience.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label htmlFor="q1_perfectionism_pressure" className="block text-sm font-medium text-gray-700">
                1. Do you often feel an intense pressure to be perfect in everything you do? (e.g., Scale 1-5, or short text)
              </label>
              <div className="mt-1">
                <input
                  id="q1_perfectionism_pressure"
                  name="q1_perfectionism_pressure"
                  type="text"
                  required
                  value={formData.q1_perfectionism_pressure}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="q2_fear_of_failure_feeling" className="block text-sm font-medium text-gray-700">
                2. How does the thought of not meeting high expectations make you feel?
              </label>
              <div className="mt-1">
                <textarea
                  id="q2_fear_of_failure_feeling"
                  name="q2_fear_of_failure_feeling"
                  rows={3}
                  required
                  value={formData.q2_fear_of_failure_feeling}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            
             <div>
              <label htmlFor="q3_imposter_syndrome_doubt" className="block text-sm font-medium text-gray-700">
                3. Do you sometimes doubt your abilities, feeling like you might be 'found out'?
              </label>
              <textarea id="q3_imposter_syndrome_doubt" name="q3_imposter_syndrome_doubt" value={formData.q3_imposter_syndrome_doubt} onChange={handleChange} rows={3} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
            </div>
            <div>
              <label htmlFor="q4_procrastination_pressure" className="block text-sm font-medium text-gray-700">
                4. Do you find yourself delaying tasks, especially if they feel overwhelming or you're worried about the outcome?
              </label>
              <textarea id="q4_procrastination_pressure" name="q4_procrastination_pressure" value={formData.q4_procrastination_pressure} onChange={handleChange} rows={3} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
            </div>
            <div>
              <label htmlFor="q5_sense_of_alienation" className="block text-sm font-medium text-gray-700">
                5. Have you ever felt different from your peers or had trouble connecting with them due to your intellectual interests or intensity?
              </label>
              <textarea id="q5_sense_of_alienation" name="q5_sense_of_alienation" value={formData.q5_sense_of_alienation} onChange={handleChange} rows={3} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
            </div>
            <div>
              <label htmlFor="q6_career_dissatisfaction" className="block text-sm font-medium text-gray-700">
               6. Despite achievements, do you feel a persistent sense of unfulfillment or that you're not living up to your 'potential'?
              </label>
              <textarea id="q6_career_dissatisfaction" name="q6_career_dissatisfaction" value={formData.q6_career_dissatisfaction} onChange={handleChange} rows={3} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
            </div>


            {error && <p className="text-sm text-red-600">{error}</p>}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? "Submitting..." : "Submit Answers"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}