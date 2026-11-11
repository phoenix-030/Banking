function equalTopicDistribution(topics: string[]) {
  const base = Math.floor(100 / topics.length);
  const remainder = 100 - base * topics.length;
  return topics.map((topicName, index) => ({
    topicName,
    percent: base + (index < remainder ? 1 : 0),
  }));
}

export function RuleBasedSelector({
  sections,
  questions,
  value,
  onChange,
}: {
  sections: any[];
  questions: any[];
  value: any[];
  onChange: (rules: any[]) => void;
}) {
  function update(sectionId: string, change: object) {
    const rule = value.find((item) => item.sectionId === sectionId) ?? {
      sectionId,
      topicDistribution: [],
      easyPercent: 30,
      mediumPercent: 50,
      hardPercent: 20,
    };
    onChange(
      value.some((item) => item.sectionId === sectionId)
        ? value.map((item) =>
            item.sectionId === sectionId ? { ...item, ...change } : item,
          )
        : [...value, { ...rule, ...change }],
    );
  }

  return (
    <div className="rule-based-selector">
      <div className="rule-selector-heading">
        <strong>Automatic non-repeating question rules</strong>
        <span>
          Automatically selects non-repeating published questions and shuffles
          option order dynamically on every student attempt. Set an optional
          topic mix and difficulty percentages summing to 100%.
        </span>
      </div>
      {sections.map((section) => {
        const rule = value.find((item) => item.sectionId === section.id) ?? {
          sectionId: section.id,
          topicDistribution: [],
          easyPercent: 30,
          mediumPercent: 50,
          hardPercent: 20,
        };
        const sectionQuestions = questions.filter(
          (q) => q.section_id === section.id,
        );
        const available = [
          ...new Set(sectionQuestions.map((q) => q.topic_name)),
        ].sort();
        const topics = [
          ...new Set([
            ...available,
            ...(rule.topicDistribution ?? []).map(
              (topic: any) => topic.topicName,
            ),
          ]),
        ];
        const topicTotal = (rule.topicDistribution ?? []).reduce(
          (sum: number, topic: any) => sum + Number(topic.percent),
          0,
        );
        const difficultyTotal =
          Number(rule.easyPercent) +
          Number(rule.mediumPercent) +
          Number(rule.hardPercent);

        function setTopicPercent(topicName: string, percent: number) {
          const distribution = rule.topicDistribution ?? [];
          const found = distribution.some(
            (item: any) => item.topicName === topicName,
          );
          const next = found
            ? distribution.map((item: any) =>
                item.topicName === topicName ? { ...item, percent } : item,
              )
            : [...distribution, { topicName, percent }];
          update(section.id, { topicDistribution: next });
        }

        return (
          <section className="rule-section" key={section.id}>
            <div className="rule-section-heading">
              <strong>{section.name}</strong>
              <span>
                {section.question_count} needed · {sectionQuestions.length}{" "}
                published available
              </span>
            </div>
            <label className="topic-mix-toggle">
              <input
                type="checkbox"
                checked={(rule.topicDistribution ?? []).length > 0}
                disabled={!topics.length}
                onChange={(e) =>
                  update(section.id, {
                    topicDistribution: e.target.checked
                      ? equalTopicDistribution(topics)
                      : [],
                  })
                }
              />
              Apply topic distribution
            </label>
            {(rule.topicDistribution ?? []).length > 0 && (
              <>
                <div className="topic-weight-list">
                  {topics.map((topic) => (
                    <label key={topic}>
                      <span>{topic}</span>
                      <input
                        aria-label={`${section.name} ${topic} percent`}
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={
                          rule.topicDistribution.find(
                            (item: any) => item.topicName === topic,
                          )?.percent ?? 0
                        }
                        onChange={(e) =>
                          setTopicPercent(topic, Number(e.target.value))
                        }
                      />
                      <i>%</i>
                    </label>
                  ))}
                </div>
                <small
                  className={
                    topicTotal === 100
                      ? "rule-total"
                      : "rule-total rule-invalid"
                  }
                >
                  Topic mix: {topicTotal}%
                  {topicTotal !== 100 ? " — must total 100%" : ""}
                </small>
              </>
            )}
            <div className="rule-difficulty-grid">
              {[
                ["Easy", "easyPercent"],
                ["Medium", "mediumPercent"],
                ["Hard", "hardPercent"],
              ].map(([label, key]) => (
                <label className="form-field" key={key}>
                  {label} %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={rule[key]}
                    onChange={(e) =>
                      update(section.id, { [key]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
            </div>
            <small
              className={
                difficultyTotal === 100
                  ? "rule-total"
                  : "rule-total rule-invalid"
              }
            >
              Difficulty mix: {difficultyTotal}%
              {difficultyTotal !== 100 ? " — must total 100%" : ""}
            </small>
          </section>
        );
      })}
      {!sections.length && (
        <p>Select an examination stage to configure its sections.</p>
      )}
    </div>
  );
}
