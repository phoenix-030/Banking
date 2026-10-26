import notificationBanner from "../../../assets/images/hero/tnpsc-notification-banner.png";
import currentAffairsBanner from "../../../assets/images/hero/current-affairs-banner.png";
import governmentSchemesBanner from "../../../assets/images/hero/government-schemes-banner.png";
import aiMentorBanner from "../../../assets/images/hero/ai-mentor-banner.png";

export const heroSlides = [
 {
  id: 1,
  image: notificationBanner,
  title: "Latest Notifications",
  description: "Get instant government exam updates.",
  link: "/notifications",
},

  {
    id: 2,
    image: currentAffairsBanner,
    link: "/current-affairs",
  },

  {
    id: 3,
    image: governmentSchemesBanner,
    link: "/government-schemes",
  },

  {
    id: 4,
    image: aiMentorBanner,
    link: "/ai-tutor",
  },
];