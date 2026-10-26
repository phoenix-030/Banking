import React from 'react'
import Hero from './components/Hero/Hero'
import StatsSection from './StatsSection'
import FeaturesSection from './FeaturesSection'
import SubjectsSection from './SubjectsSection'
import Categories from './Categories'
import CurrentAffairs from './CurrentAffairs'
import CTA from './CTA'

const Home = () => {
  return (
    <>
      <Hero />

      <StatsSection />

      <FeaturesSection />

      <SubjectsSection />

      <CurrentAffairs />

      <Categories />

      <CTA />
    </>
  )
}

export default Home