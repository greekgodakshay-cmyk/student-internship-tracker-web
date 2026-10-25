(() => {
  const topics = {
    learning: { title: "Learning, with direction", kicker: "LEARN WITH PURPOSE", image: "/images/feature-learning-direction.jpeg", alt: "A professional looking toward a city and a path toward future goals", summary: "Give your curiosity a direction and make your learning easier to follow.", heading: "Make learning part of a bigger picture.", paragraphs: [
      "Learning becomes more valuable when it connects knowledge with a purpose. A course can introduce an idea, but consistent practice, reflection, and application help turn that idea into understanding. This space is designed to help you keep track of the subjects you explore and the progress you make along the way.",
      "Start with a realistic goal, choose a useful next topic, and make time to practise what you learn. You do not need to plan an entire career in one sitting. Reviewing your progress regularly can help you identify gaps, recognise interests, and make more confident decisions about what to study next.",
      "A useful learning routine is specific and sustainable: set a small objective, work through the material, apply it in a task, and note what remains unclear. Over time, these small steps can create a clearer record of effort and development."
    ], sections: [{ title: "Turn information into understanding", text: "Use courses as a starting point, then reinforce concepts through exercises, notes, discussion, and practical tasks. Revisiting a topic after applying it can reveal what you understand well and what needs more attention." }, { title: "Choose the next step deliberately", text: "Connect learning goals to the projects, roles, or problems that interest you. A short list of priorities can make progress easier to sustain than trying to learn everything at once." }], resources: [{ label: "Professional development", url: "https://en.wikipedia.org/wiki/Professional_development" }] },
    skills: { title: "Skills you can show", kicker: "DEVELOP THROUGH PRACTICE", image: "/images/feature-skills.jpeg", alt: "Skill development represented by a rising progress arrow", summary: "Build practical strengths and describe them clearly through the work you do.", heading: "Let your skills grow through real use.", paragraphs: [
      "A skill is more meaningful when you can explain how you have used it. Coursework can establish foundations, while projects, collaboration, and repeated practice help you develop judgement and confidence. Recording the skills you are working on gives you a clearer view of your strengths and the areas you want to improve.",
      "Keep descriptions honest and concrete. Rather than relying on labels alone, connect a skill to a task, tool, decision, or outcome. This makes it easier to reflect on your experience and communicate your contribution to classmates, mentors, and potential employers.",
      "Skills also develop at different rates. Review your list as you gain experience, add context where it is useful, and treat gaps as a guide for future practice rather than a measure of personal worth."
    ], sections: [{ title: "Demonstrate, do not just list", text: "A small working example, a completed task, or a clear explanation of your approach can provide useful evidence of what you know. Describe your role accurately and be specific about the tools and methods you used." }, { title: "Build transferable strengths", text: "Communication, collaboration, planning, and problem-solving matter alongside technical knowledge. Practising these skills in group work and personal projects can help you prepare for different professional environments." }], resources: [{ label: "Transferable skills", url: "https://en.wikipedia.org/wiki/Transferable_skill" }] },
    projects: { title: "Projects and achievements", kicker: "MAKE YOUR WORK VISIBLE", image: "/images/feature-achievements.jpeg", alt: "Hands raising a trophy in celebration of achievement", summary: "Capture the work, decisions, and milestones that show what you are learning to do.", heading: "Turn ideas into work you can learn from.", paragraphs: [
      "Projects give ideas a practical form. They create opportunities to test assumptions, solve problems, make decisions, and learn from results. Project-based learning is valued in part because it connects concepts with meaningful challenges and asks learners to investigate, create, and reflect rather than only memorise information.",
      "Keep a concise record of what you set out to do, what you contributed, which tools or skills you used, and what the result taught you. Include setbacks and improvements when relevant; thoughtful reflection often communicates more than a polished outcome alone.",
      "A collection of projects can become a useful record of your development. It can help you prepare for interviews, discuss your approach with mentors, and decide which kinds of problems you would like to work on next."
    ], sections: [{ title: "Document the process", text: "Capture the problem, your approach, key decisions, and the result. If you worked with others, make your individual contribution clear and acknowledge the team's work." }, { title: "Reflect and improve", text: "After finishing, identify what worked, what you would change, and what you want to learn before the next attempt. Each project can provide a practical starting point for the next one." }], resources: [{ label: "Project-based learning", url: "https://en.wikipedia.org/wiki/Project-based_learning" }] },
    internships: { title: "Internship tracking", kicker: "EXPLORE YOUR NEXT OPPORTUNITY", image: "/images/feature-internship-tracking.jpeg", alt: "A person planning goals and tracking progress on a whiteboard", summary: "Keep opportunities and application steps organized while you explore your next move.", heading: "Approach opportunities with a plan.", paragraphs: [
      "An internship can help connect academic learning with the expectations of a professional setting. It may offer exposure to real workflows, collaboration, feedback, and the day-to-day responsibilities of a field. The value depends on the quality of the experience, the support available, and the care you take to learn from it.",
      "Searching and applying can involve deadlines, eligibility requirements, application links, and follow-ups. Keeping the details together makes it easier to compare roles, prepare materials, and see which actions need attention. Review each opportunity carefully and verify important details with the organisation offering it.",
      "Prepare a focused application that explains your relevant learning and projects, keep track of each stage, and reflect on what you learn from the process. A thoughtful, organised approach can make the search more manageable without promising any particular outcome."
    ], sections: [{ title: "Compare roles thoughtfully", text: "Review responsibilities, required skills, location or work mode, duration, eligibility, and deadlines. Look for opportunities that match your interests and offer a reasonable chance to learn and contribute." }, { title: "Keep your process organised", text: "Record the status of each application and any next action, such as preparing a portfolio, following up, or getting ready for an interview. Protect your personal information and use official application channels where possible." }], resources: [{ label: "Internships", url: "https://en.wikipedia.org/wiki/Internship" }] },
    profile: { title: "A more complete picture of you", kicker: "PRESENT YOUR DEVELOPMENT", image: "/images/feature-your-profile.jpeg", alt: "A person reflecting on their future self and professional goals", summary: "Bring your skills and achievements together so others can understand the work behind your growth.", heading: "Tell a clear, honest story about your progress.", paragraphs: [
      "A professional profile can connect the different parts of your development: the skills you are building, the projects you have completed, the learning you have pursued, and the achievements you choose to share. Together, these details can give others a more useful picture of your interests and experience than a list of claims alone.",
      "Clarity matters more than exaggeration. Use concise descriptions, explain your contribution to collaborative work, and keep dates, credentials, and outcomes accurate. A profile is most useful when it reflects both what you can do today and what you are actively working to improve.",
      "Your privacy should remain part of the decision. Share only information you are comfortable making visible, review your settings, and update your profile as your goals and experience change."
    ], sections: [{ title: "Make your experience easy to understand", text: "Choose examples that are relevant to your goals and describe the problem, your contribution, and the outcome. Clear context helps readers understand the value of your work." }, { title: "Share with intention", text: "Review visibility and privacy settings before publishing information. Keep your profile current, respectful, and focused on the professional story you want to communicate." }], resources: [{ label: "Career development", url: "https://en.wikipedia.org/wiki/Career_development" }] }
  };
  const params = new URLSearchParams(window.location.search);
  const topic = topics[params.get("topic")] ? params.get("topic") : "learning";
  const data = topics[topic];
  document.title = `${data.title} | Student Internship & Skill Tracker`;
  document.getElementById("feature-title").textContent = data.title;
  document.getElementById("feature-kicker").textContent = data.kicker;
  document.getElementById("feature-image").src = data.image;
  document.getElementById("feature-image").alt = data.alt;
  document.getElementById("feature-summary").textContent = data.summary;
  document.getElementById("feature-body-title").textContent = data.heading;
  const copy = document.getElementById("feature-body-copy");
  const blocks = data.paragraphs.map((paragraph) => { const p = document.createElement("p"); p.textContent = paragraph; return p; });
  (data.sections || []).forEach((section) => {
    const wrapper = document.createElement("section");
    wrapper.className = "feature-detail-topic";
    const heading = document.createElement("h3"); heading.textContent = section.title;
    const paragraph = document.createElement("p"); paragraph.textContent = section.text;
    wrapper.append(heading, paragraph); blocks.push(wrapper);
  });
  if (data.resources && data.resources.length) {
    const resources = document.createElement("section"); resources.className = "feature-detail-resources";
    const heading = document.createElement("h3"); heading.textContent = "Further reading";
    const list = document.createElement("ul");
    data.resources.forEach((resource) => {
      const item = document.createElement("li"); const link = document.createElement("a");
      link.textContent = resource.label; link.href = resource.url; link.target = "_blank"; link.rel = "noopener noreferrer";
      item.appendChild(link); list.appendChild(item);
    });
    resources.append(heading, list); blocks.push(resources);
  }
  copy.replaceChildren(...blocks);
})();
