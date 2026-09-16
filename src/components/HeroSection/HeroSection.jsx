import React from 'react';
import './HeroSection.css';
import BlurText from '../../reactbits/BlurText';
import GradientText from '../../reactbits/GradientText';

export default function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-heading">
      <div className="container hero-container">
        {/* Headline */}
        <h1 id="hero-heading" className="hero-title">
          <BlurText
            text="Turn Complex Technical Documents Into"
            className="hero-title-blur"
            delay={70}
            animateBy="words"
            direction="top"
          />
          <GradientText className="hero-title-accent" animationSpeed={5}>
            Clear Customer Showcases
          </GradientText>
        </h1>

        {/* Subtext */}
        <p className="hero-subtext">
          Upload your technical discovery document (PDF or Word) and business details to generate an interactive, client-ready proposal.
        </p>
      </div>
    </section>
  );
}
