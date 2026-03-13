import React, { useState, lazy } from "react";
import emailjs from "emailjs-com";
import { Mail, Phone, User, MessageSquare, Send, MapPin, Clock } from "lucide-react";

const Navbar = lazy(() => import("./Navbar"));

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await emailjs.send(
        "service_xou28io",
        "template_pljub4d",
        formData,
        "s6oq3sz3VlQP5LFs7"
      );
      alert("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      console.error("Email sending failed:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      content: "booxclash@gmail.com",
      description: "Get in touch via email"
    },
    {
      icon: Phone,
      title: "Call Us",
      content: "+260 967 001 972",
      description: "Speak with our team"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      content: "Lusaka, Zambia",
      description: "Our headquarters"
    },
    {
      icon: Clock,
      title: "Office Hours",
      content: "Mon-Fri: 8AM-5PM CAT",
      description: "When we're available"
    }
  ];

  const faqs = [
    {
      question: "How does BooxClash Learn work?",
      answer: "BooxClash combines AI-driven lesson planning, digital schemes of work, and automated reporting to create a seamless experience aligned with curriculum standards."
    },
    {
      question: "Is BooxClash suitable for all grades?",
      answer: "Yes! Our platform is designed for all grades with customizable content and difficulty levels that adapt to your specific syllabus."
    },
    {
      question: "Can administration track coverage?",
      answer: "Absolutely! Our dashboard provides detailed insights into syllabus coverage, teacher engagement, and overall school performance."
    },
    {
      question: "How do we onboard our school?",
      answer: "Send us a message using the form above. Our team will reach out to set up a demo and guide you through bulk-uploading your teachers and templates."
    }
  ];

  return (
    <>
      <title>Contact – BooxClash Learn</title>
      <meta
        name="description"
        content="Get in touch with the BooxClash Learn team for support, partnerships, or feedback. We’d love to hear from you."
      />
      <meta name="keywords" content="BooxClash Learn, contact, support, help" />
      <link rel="canonical" href="https://booxclashlearn.com/contact" />
      
      {/* --- LIGHT THEME BACKGROUND --- */}
      <div className="relative min-h-screen w-full bg-[#f0fff0] font-sans selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7]">
        
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />

          <main className="flex-grow pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
            
            {/* Hero Section */}
            <section className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
                Get in <span className="text-[#ffa500]">Touch</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Have questions about BooxClash? We'd love to hear from you. Send us a message and our support team will respond shortly.
              </p>
            </section>

            {/* Contact Info Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
              {contactInfo.map((info, index) => (
                <div 
                  key={index}
                  className="bg-white p-8 rounded-2xl border border-slate-100 text-center hover:shadow-[0_8px_30px_rgba(255,165,0,0.15)] hover:border-[#ffa500]/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-xl bg-[#6c2dc7]/10 text-[#6c2dc7] flex items-center justify-center mb-6 mx-auto">
                    <info.icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{info.title}</h3>
                  <p className="text-[#ffa500] font-medium mb-2">{info.content}</p>
                  <p className="text-slate-500 text-sm">{info.description}</p>
                </div>
              ))}
            </section>

            <div className="grid lg:grid-cols-5 gap-16 items-start">
              
              {/* Contact Form with Orange Glow */}
              <section className="lg:col-span-3">
                <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#ffa500]/20 shadow-[0_8px_30px_rgba(255,165,0,0.15)]">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Send a Message</h2>
                    <p className="text-slate-600 text-sm">Fill out the form below and we'll get back to you within 24 hours.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          placeholder="Your Name"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[#ffa500] focus:ring-1 focus:ring-[#ffa500] transition-all placeholder:text-slate-400"
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          placeholder="Your Email"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[#ffa500] focus:ring-1 focus:ring-[#ffa500] transition-all placeholder:text-slate-400"
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        placeholder="Your Phone Number (Optional)"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[#ffa500] focus:ring-1 focus:ring-[#ffa500] transition-all placeholder:text-slate-400"
                        onChange={handleChange}
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute top-4 left-0 pl-4 flex items-start pointer-events-none">
                        <MessageSquare className="h-5 w-5 text-slate-400" />
                      </div>
                      <textarea
                        name="message"
                        value={formData.message}
                        rows={5}
                        placeholder="How can we help you?"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[#ffa500] focus:ring-1 focus:ring-[#ffa500] transition-all resize-none placeholder:text-slate-400"
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                        isSubmitting
                          ? "bg-slate-200 cursor-not-allowed text-slate-400"
                          : "bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 transform hover:-translate-y-1 shadow-[0_4px_14px_rgba(255,165,0,0.4)]"
                      }`}
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
                      {!isSubmitting && <Send size={18} />}
                    </button>
                  </form>
                </div>
              </section>

              {/* FAQ Section */}
              <section className="lg:col-span-2">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">FAQs</h2>
                  <p className="text-slate-600 text-sm">Quick answers to common questions.</p>
                </div>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900 mb-2">{faq.question}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default Contact;