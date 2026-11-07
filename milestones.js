/* Shared by the portfolio and owner editor so legacy records group identically. */
window.PortfolioMilestones = {
  normalize(items) {
    return (Array.isArray(items) ? items : []).flatMap(item => {
      const text = `${item.title || ''} ${item.year || ''}`;
      const kind = ['education', 'certification', 'experience', 'achievement'].includes(item.kind)
        ? item.kind
        : /certificat/i.test(text) ? 'certification'
          : /achievement|hackathon|award/i.test(text) ? 'achievement'
            : /degree|b\.tech|education|school|college/i.test(text) ? 'education' : 'experience';
      // Split the original bundled certificate record without inventing verification URLs.
      if (!item.certificateUrl && item.title === 'Professional Certifications' && /Certified System Administrator/.test(item.detail || '') && /Certified Application Developer/.test(item.detail || '') && /NPTEL Python for Data Science/.test(item.detail || '')) {
        return [
          { title: 'ServiceNow Certified System Administrator (CSA)', detail: 'ServiceNow platform administration.' },
          { title: 'ServiceNow Certified Application Developer (CAD)', detail: 'Application development on the ServiceNow platform.' },
          { title: 'NPTEL Python for Data Science', detail: 'Python, data analysis, and machine learning fundamentals.' }
        ].map(entry => ({ ...item, ...entry, kind: 'certification', certificateUrl: '' }));
      }
      // The original hackathon record contains two independent achievements.
      if (!item.certificateUrl && item.title === 'Hackathons & Competitive Work') {
        const details = String(item.detail || '').split(/<br\s*\/?\s*>/i).filter(Boolean);
        if (details.length === 2) return details.map((detail, index) => ({ ...item, title: index === 0 ? 'AITAM 24-hour Hackathon' : 'V Cube 7-hour Hackathon', detail, kind: 'achievement', certificateUrl: '' }));
      }
      return [{ ...item, kind }];
    }).map(item => ({ ...item, featured: item.featured !== false }));
  },
  partition(items, kind) {
    const all = this.normalize(items).filter(item => item.kind === kind);
    return { all, featured: all.filter(item => item.featured), hasMore: all.some(item => !item.featured) };
  },
  headings(about = {}) {
    return {
      learning: !about.learningTitle || about.learningTitle === 'Education & Certifications' ? 'Education & Experience' : about.learningTitle,
      career: !about.careerTitle || about.careerTitle === 'Experience & Achievements' ? 'Certifications & Achievements' : about.careerTitle
    };
  }
};
